import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { Usuario } from '@/models/Usuario'
import { Iglesia } from '@/models/Iglesia'
import { MonthlySubscription as Subscription } from '@/models/MonthlySubscription'
import { SubscriptionPayment } from '@/models/SubscriptionPayment'
import { beginSubscription, syncSubscriptionEvent } from '@/services/subscriptions'
import { googleSignIn } from '@/services/auth-users'
import { POST as register } from '@/app/api/register/route'
import { verifyWebhookSignature, nextBillingMonth } from '@/lib/payments/validation'
import { getMonthlyPlan } from '@/lib/payments/mercadopago'
import type { User } from 'next-auth'

let database: MongoMemoryReplSet
const originalFetch = globalThis.fetch
let remote: Record<string, unknown>
let paymentStatus: string
let price: number
let invoiceId: number
let debitDate: string

before(async () => {
  database = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '8.0.4' } })
  // This suite never loads .env.local and always replaces the DB URI before connecting.
  process.env.MONGODB_URI = database.getUri('klave-tests')
  process.env.AUTH_SECRET = 'integration-test-secret-only'
  await mongoose.connect(process.env.MONGODB_URI)
  await Promise.all([Usuario.init(), Iglesia.init(), Subscription.init(), SubscriptionPayment.init()])
})
after(async () => {
  globalThis.fetch = originalFetch
  await mongoose.disconnect()
  await database?.stop()
})
beforeEach(async () => {
  await Promise.all([Usuario.deleteMany({}), Iglesia.deleteMany({}), Subscription.deleteMany({}), SubscriptionPayment.deleteMany({})])
  Object.assign(process.env, {
    MERCADOPAGO_ENABLED: 'true', MERCADOPAGO_ACCESS_TOKEN: 'test-only',
    MERCADOPAGO_WEBHOOK_SECRET: 'test-secret', MERCADOPAGO_COLLECTOR_ID: '123',
    MERCADOPAGO_MONTHLY_PRICE: '15000', MERCADOPAGO_LIVE_MODE: 'false',
    NEXT_PUBLIC_APP_URL: 'https://klave.example',
  })
  paymentStatus = 'approved'; price = 15000; invoiceId = 1; debitDate = new Date().toISOString()
  remote = {
    id: 'remote-subscription', external_reference: '', collector_id: 123, status: 'pending',
    last_modified: new Date().toISOString(), init_point: 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=test',
    auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: 15000, currency_id: 'ARS' },
  }
  globalThis.fetch = (async (input, init) => {
    const url = String(input)
    if (url.includes('/preapproval/search')) return Response.json({ results: [] })
    if (url.endsWith('/preapproval') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body))
      assert.equal(body.status, 'pending')
      assert.equal(body.auto_recurring.frequency_type, 'months')
      remote.external_reference = body.external_reference
      return Response.json(remote)
    }
    if (url.includes('/preapproval/')) return Response.json(remote)
    if (url.includes('/authorized_payments/')) return Response.json({
      id: invoiceId, preapproval_id: remote.id, debit_date: debitDate, payment: { id: 100 + invoiceId },
    })
    if (url.includes('/v1/payments/')) return Response.json({
      id: 100 + invoiceId, status: paymentStatus, transaction_amount: price, currency_id: 'ARS', collector_id: 123, live_mode: false,
    })
    throw new Error('Unexpected external request: ' + url)
  }) as typeof fetch
})

async function pendingUser(email = 'owner@example.com') {
  return Usuario.create({ nombre: 'Owner', email, rol: 'ADMIN', activo: true, status: 'ACTIVE', onboardingStatus: 'PENDING' })
}
async function start() {
  const user = await pendingUser()
  await beginSubscription(user.id, { iglesiaName: 'Test Church', slug: 'test-church' })
  return user
}
function google(email: string, verified: boolean | undefined = true) {
  const user: User = { name: 'Google Owner', nombre: '', email, rol: 'ADMIN' }
  return { user, account: { provider: 'google', type: 'oidc' as const, providerAccountId: 'google-test-id' }, profile: { email, email_verified: verified } }
}

test('Google creates a pending admin without church access; repeat login is idempotent', async () => {
  const input = google('google@example.com')
  assert.equal(await googleSignIn(input), true)
  assert.equal(input.user.onboardingStatus, 'PENDING')
  assert.equal(input.user.iglesiaId, null)
  assert.equal(await googleSignIn(google('google@example.com')), true)
  assert.equal(await Usuario.countDocuments({}), 1)
  assert.equal(await Iglesia.countDocuments({}), 0)
})

test('Google rejects unverified emails and does not reactivate disabled accounts', async () => {
  assert.equal(await googleSignIn(google('google@example.com', false)), '/login?error=EmailNotVerified')
  const unknown: Parameters<typeof googleSignIn>[0] = google('google@example.com')
  delete unknown.profile!.email_verified
  assert.equal(await googleSignIn(unknown), '/login?error=EmailNotVerified')
  await Usuario.create({ nombre: 'Disabled', email: 'google@example.com', rol: 'ADMIN', activo: false, status: 'DISABLED', onboardingStatus: 'PENDING' })
  assert.equal(await googleSignIn(google('google@example.com')), '/login?error=NoAccount')
  assert.equal((await Usuario.findOne({}))?.activo, false)
})

test('claiming an unverified password signup with Google removes the planted password', async () => {
  await Usuario.create({ nombre: 'Owner', email: 'google@example.com', rol: 'ADMIN', passwordHash: 'planted', onboardingStatus: 'PENDING' })
  assert.equal(await googleSignIn(google('google@example.com')), true)
  assert.equal((await Usuario.findOne({}))?.passwordHash, undefined)
})

test('password signup cannot request a privileged role or bypass subscription', async () => {
  const response = await register(new Request('https://klave.example/api/register', {
    method: 'POST', headers: { origin: 'https://klave.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Owner', email: 'new@example.com', password: 'Test-only-123', rol: 'SUPER_ADMIN', iglesiaId: 'fake' }),
  }))
  assert.equal(response.status, 201)
  const user = await Usuario.findOne({ email: 'new@example.com' })
  assert.equal(user?.rol, 'ADMIN'); assert.equal(user?.iglesiaId, null)
  assert.equal(user?.onboardingStatus, 'PENDING')
  assert.equal(await Iglesia.countDocuments({}), 0)
})

test('cross-origin signup is rejected before any write', async () => {
  const response = await register(new Request('https://klave.example/api/register', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }))
  assert.equal(response.status, 403)
  assert.equal(await Usuario.countDocuments({}), 0)
})

test('missing payment configuration fails closed even with the legacy bypass flag', async () => {
  const user = await pendingUser()
  process.env.ALLOW_DIRECT_REGISTER = 'true'
  delete process.env.MERCADOPAGO_ACCESS_TOKEN
  assert.equal(getMonthlyPlan().enabled, false)
  await assert.rejects(beginSubscription(user.id, { iglesiaName: 'Test', slug: 'test' }))
  assert.equal(await Iglesia.countDocuments({}), 0)
})

test('authorizing the subscription alone does not activate the church', async () => {
  const user = await start()
  remote.status = 'authorized'
  await syncSubscriptionEvent('subscription_preapproval', String(remote.id))
  assert.equal((await Iglesia.findOne({}))?.status, 'PENDING')
  assert.equal((await Usuario.findById(user.id))?.iglesiaId, null)
})

test('approved first payment activates once; repeated and out-of-order invoices do not extend access', async () => {
  const user = await start()
  await syncSubscriptionEvent('subscription_authorized_payment', '1')
  await syncSubscriptionEvent('subscription_authorized_payment', '1')
  const church = await Iglesia.findOne({})
  assert.equal(church?.status, 'ACTIVE')
  assert.equal((await Usuario.findById(user.id))?.onboardingStatus, 'COMPLETED')
  assert.equal(await SubscriptionPayment.countDocuments({}), 1)
  const expected = nextBillingMonth(debitDate).toISOString()
  assert.equal(church?.subscriptionPaidThrough?.toISOString(), expected)
  invoiceId = 2; debitDate = new Date(Date.now() - 60 * 86400000).toISOString()
  await syncSubscriptionEvent('subscription_authorized_payment', '2')
  assert.equal((await Iglesia.findOne({}))?.subscriptionPaidThrough?.toISOString(), expected)
})

test('wrong payment amount cannot activate access', async () => {
  await start(); price = 1
  await assert.rejects(syncSubscriptionEvent('subscription_authorized_payment', '1'))
  assert.equal((await Iglesia.findOne({}))?.status, 'PENDING')
})

test('refund removes access and cancellation preserves only the paid period', async () => {
  await start()
  await syncSubscriptionEvent('subscription_authorized_payment', '1')
  remote.status = 'cancelled'; remote.last_modified = new Date(Date.now() + 1000).toISOString()
  await syncSubscriptionEvent('subscription_preapproval', String(remote.id))
  assert.equal((await Subscription.findOne({}))?.status, 'CANCELLED')
  assert.equal((await Iglesia.findOne({}))?.subscriptionStatus, 'ACTIVE')
  paymentStatus = 'refunded'
  await syncSubscriptionEvent('payment', '101')
  assert.notEqual((await Iglesia.findOne({}))?.subscriptionStatus, 'ACTIVE')
})

test('duplicate church slug rolls back the second subscription', async () => {
  await start()
  const second = await pendingUser('second@example.com')
  await assert.rejects(beginSubscription(second.id, { iglesiaName: 'Other', slug: 'test-church' }))
  assert.equal(await Iglesia.countDocuments({}), 1)
  assert.equal(await Subscription.countDocuments({}), 1)
})

test('webhook signature binds the resource ID and request ID', () => {
  const input = { id: 'ABC123', requestId: 'req-1', secret: 'test-secret', signature: '' }
  const hash = createHmac('sha256', input.secret).update('id:abc123;request-id:req-1;ts:123;').digest('hex')
  input.signature = `ts=123,v1=${hash}`
  assert.equal(verifyWebhookSignature(input), true)
  assert.equal(verifyWebhookSignature({ ...input, id: 'other' }), false)
  assert.equal(verifyWebhookSignature({ ...input, requestId: 'other' }), false)
  assert.equal(verifyWebhookSignature({ ...input, secret: '' }), false)
  assert.equal(nextBillingMonth('2028-01-31T12:00:00Z').toISOString(), '2028-02-29T12:00:00.000Z')
})
