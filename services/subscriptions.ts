import 'server-only'
import mongoose from 'mongoose'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { AppError, ConflictError, ForbiddenError } from '@/lib/errors'
import { Usuario } from '@/models/Usuario'
import { Iglesia } from '@/models/Iglesia'
import { MonthlySubscription as Subscription } from '@/models/MonthlySubscription'
import { SubscriptionPayment } from '@/models/SubscriptionPayment'
import { getMonthlyPlan, mpRequest, PreapprovalSchema, InvoiceSchema, PaymentSchema, safeCheckoutUrl } from '@/lib/payments/mercadopago'
import { nextBillingMonth, validMonthlyTerms } from '@/lib/payments/validation'

export const ChurchSchema = z.object({
  iglesiaName: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().min(2).max(40).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
})

export async function beginSubscription(userId: string, church: z.infer<typeof ChurchSchema>) {
  const plan = getMonthlyPlan()
  if (!plan.enabled || plan.amount === null) throw new AppError('Las suscripciones todavía no están disponibles', 503)
  const amount = plan.amount
  await connectDB()
  await Promise.all([Subscription.init(), SubscriptionPayment.init()])
  let subscription = await Subscription.findOne({ userId })
  if (!subscription) {
    try {
      await mongoose.connection.transaction(async (session) => {
        const user = await Usuario.findById(userId).session(session)
        if (!user || !user.activo || user.status !== 'ACTIVE' || user.rol !== 'ADMIN' || user.iglesiaId || user.onboardingStatus !== 'PENDING') {
          throw new ForbiddenError('Esta cuenta no puede crear otra iglesia')
        }
        const [iglesia] = await Iglesia.create([{
          nombre: church.iglesiaName, slug: church.slug, plan: 'pro',
          status: 'PENDING', subscriptionStatus: 'PENDING', estadoSuscripcion: 'vencida',
        }], { session })
        await Subscription.create([{
          userId: user._id, iglesiaId: iglesia._id, email: user.email,
          ...church, amount, currency: plan.currency,
        }], { session })
      })
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error
      if (!await Subscription.exists({ userId })) throw new ConflictError('Ese identificador de iglesia ya está en uso')
    }
    subscription = await Subscription.findOne({ userId })
  }
  if (!subscription) throw new AppError('No pudimos preparar la suscripción', 500)
  if (subscription.checkoutUrl) return { checkoutUrl: safeCheckoutUrl(subscription.checkoutUrl) }

  const locked = await Subscription.findOneAndUpdate({
    _id: subscription._id, providerId: { $exists: false },
    $or: [{ checkoutLeaseUntil: { $exists: false } }, { checkoutLeaseUntil: { $lt: new Date() } }],
  }, { $set: { checkoutLeaseUntil: new Date(Date.now() + 60_000) } }, { new: true })
  if (!locked) throw new ConflictError('Estamos preparando tu suscripción. Volvé a intentar en un minuto.')

  // Recover a previously created subscription if the provider response or DB write was interrupted.
  const previous = await mpRequest('/preapproval/search?' + new URLSearchParams({
    payer_email: subscription.email, limit: '100', offset: '0',
  }), z.object({
    paging: z.object({ total: z.number() }).optional(),
    results: z.array(z.object({ id: z.string(), external_reference: z.union([z.string(), z.number()]).optional() })),
  }))
  if ((previous.paging?.total ?? 0) > 100) throw new ConflictError('La suscripción necesita revisión. Contactá a soporte.')
  const matches = previous.results.filter((result) => String(result.external_reference) === subscription.id)
  if (matches.length > 1) throw new ConflictError('La suscripción necesita revisión. Contactá a soporte.')
  const remote = matches[0] ? await mpRequest(`/preapproval/${encodeURIComponent(matches[0].id)}`, PreapprovalSchema)
    : await mpRequest('/preapproval', PreapprovalSchema, {
    reason: 'Klave Pro — suscripción mensual', external_reference: subscription.id,
    payer_email: subscription.email, status: 'pending',
    auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: subscription.amount, currency_id: subscription.currency },
    back_url: new URL('/onboarding?payment=return', process.env.NEXT_PUBLIC_APP_URL).toString(),
  }, subscription.id)
  if (!remote.init_point || remote.external_reference !== subscription.id ||
    String(remote.collector_id) !== process.env.MERCADOPAGO_COLLECTOR_ID ||
    !validMonthlyTerms(remote.auto_recurring, subscription)) throw new AppError('La suscripción recibida no coincide con el plan', 502)
  const checkoutUrl = safeCheckoutUrl(remote.init_point)
  await Subscription.updateOne({ _id: subscription._id }, {
    $set: { providerId: remote.id, checkoutUrl }, $unset: { checkoutLeaseUntil: 1 },
  })
  return { checkoutUrl }
}

export async function syncSubscriptionEvent(type: string, id: string) {
  if (type === 'payment') {
    await connectDB()
    const record = await SubscriptionPayment.findOne({ paymentId: id }).lean()
    if (!record) return
    return syncSubscriptionEvent('subscription_authorized_payment', record.invoiceId)
  }
  const invoice = type === 'subscription_authorized_payment'
    ? await mpRequest(`/authorized_payments/${encodeURIComponent(id)}`, InvoiceSchema) : null
  const providerId = invoice?.preapproval_id ?? id
  const remote = await mpRequest(`/preapproval/${encodeURIComponent(providerId)}`, PreapprovalSchema)
  await connectDB()
  if (!mongoose.isValidObjectId(remote.external_reference)) return
  const existing = await Subscription.findById(remote.external_reference)
  if (!existing) return
  if (remote.id !== providerId || (existing.providerId && existing.providerId !== providerId) ||
    String(remote.collector_id) !== process.env.MERCADOPAGO_COLLECTOR_ID ||
    !validMonthlyTerms(remote.auto_recurring, existing)) throw new ForbiddenError('La suscripción no coincide con el alta')

  const payment = invoice?.payment?.id
    ? await mpRequest(`/v1/payments/${invoice.payment.id}`, PaymentSchema) : null
  if (payment && (payment.id !== invoice!.payment!.id ||
    payment.transaction_amount !== existing.amount || payment.currency_id !== existing.currency ||
    String(payment.collector_id) !== process.env.MERCADOPAGO_COLLECTOR_ID ||
    payment.live_mode !== (process.env.MERCADOPAGO_LIVE_MODE === 'true'))) {
    throw new ForbiddenError('El pago no coincide con la suscripción')
  }

  await mongoose.connection.transaction(async (session) => {
    const subscription = await Subscription.findById(existing._id).session(session)
    if (!subscription) throw new AppError('Suscripción no encontrada', 500)
    if (!subscription.providerUpdatedAt || new Date(remote.last_modified) >= subscription.providerUpdatedAt) {
      subscription.providerUpdatedAt = new Date(remote.last_modified)
      subscription.providerStatus = remote.status
    }
    subscription.providerId = providerId
    if (payment && invoice) {
      await SubscriptionPayment.updateOne({ paymentId: String(payment.id), subscriptionId: subscription._id }, {
        $set: {
          paidThrough: nextBillingMonth(invoice.debit_date),
          invoiceId: String(invoice.id),
          approved: payment.status === 'approved' && !payment.transaction_amount_refunded,
        },
      }, { upsert: true, session })
    }
    const latest = await SubscriptionPayment.findOne({ subscriptionId: subscription._id, approved: true })
      .sort({ paidThrough: -1 }).session(session)
    const paidThrough = latest?.paidThrough
    const active = Boolean(paidThrough && paidThrough > new Date())
    subscription.paidThrough = paidThrough
    subscription.status = subscription.providerStatus === 'cancelled' ? 'CANCELLED'
      : active ? 'ACTIVE' : latest ? 'PAST_DUE' : 'PENDING'
    await subscription.save({ session })

    const iglesia = await Iglesia.findById(subscription.iglesiaId).session(session)
    if (!iglesia) throw new AppError('Iglesia no encontrada', 500)
    iglesia.subscriptionStatus = active ? 'ACTIVE' : latest ? 'PAST_DUE' : 'PENDING'
    iglesia.subscriptionPaidThrough = paidThrough
    iglesia.estadoSuscripcion = active ? 'activa' : 'vencida'
    if (active && iglesia.status === 'PENDING') iglesia.status = 'ACTIVE'
    await iglesia.save({ session })
    if (active) {
      await Usuario.updateOne({
        _id: subscription.userId, iglesiaId: null, rol: 'ADMIN', activo: true,
        status: 'ACTIVE', onboardingStatus: 'PENDING',
      }, { $set: { iglesiaId: iglesia._id, onboardingStatus: 'COMPLETED' } }, { session })
    }
  })
}
