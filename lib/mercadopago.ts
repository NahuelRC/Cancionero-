import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import { AppError, ValidationError } from '@/lib/errors'
import { createOnboardingInvitationFromPayment } from '@/services/onboarding'

const API_URL = 'https://api.mercadopago.com'
const DEFAULT_PLAN_ID = 'klave-pro-monthly'
const DEFAULT_REASON = 'Klave Pro Mensual'
const DEFAULT_CURRENCY = 'ARS'

interface MercadoPagoPlan {
  id: string
  reason: string
  amount: number
  currencyId: string
}

interface CreateMercadoPagoCheckoutInput {
  email: string
  planId?: string
}

interface MercadoPagoPreapprovalResponse {
  id: string
  init_point?: string
  sandbox_init_point?: string
  status?: string
  payer_email?: string
  external_reference?: string | number
}

interface MercadoPagoWebhookPayload {
  type?: string
  action?: string
  data?: {
    id?: string
  }
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_PLAN_PRO_AMOUNT)
}

export function getMercadoPagoPlan(planId?: string): MercadoPagoPlan {
  const configuredPlanId = process.env.MERCADOPAGO_PLAN_PRO_ID ?? DEFAULT_PLAN_ID
  const requestedPlanId = planId ?? configuredPlanId
  if (requestedPlanId !== configuredPlanId) throw new ValidationError('Plan invalido')

  const amount = Number(process.env.MERCADOPAGO_PLAN_PRO_AMOUNT)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Mercado Pago no esta configurado', 500)
  }

  return {
    id: configuredPlanId,
    reason: process.env.MERCADOPAGO_PLAN_PRO_REASON ?? DEFAULT_REASON,
    amount,
    currencyId: process.env.MERCADOPAGO_CURRENCY_ID ?? DEFAULT_CURRENCY,
  }
}

export async function createMercadoPagoCheckout(input: CreateMercadoPagoCheckoutInput) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) throw new AppError('Mercado Pago no esta configurado', 500)

  const appUrl = getPublicAppUrl()
  const plan = getMercadoPagoPlan(input.planId)
  const payload = {
    reason: plan.reason,
    external_reference: plan.id,
    payer_email: input.email.toLowerCase(),
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: plan.amount,
      currency_id: plan.currencyId,
    },
    back_url: `${appUrl}/register?checkout=mercadopago`,
    notification_url: `${appUrl}/api/payments/mercadopago/webhook`,
  }

  const preapproval = await mercadoPagoRequest<MercadoPagoPreapprovalResponse>(
    '/preapproval',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  )

  const initPoint = preapproval.init_point ?? preapproval.sandbox_init_point
  if (!preapproval.id || !initPoint) {
    throw new AppError('Mercado Pago no devolvio un checkout valido', 502)
  }

  return {
    subscriptionId: preapproval.id,
    initPoint,
    status: preapproval.status ?? 'pending',
  }
}

export async function handleMercadoPagoWebhook(
  payload: MercadoPagoWebhookPayload,
  dataId: string,
) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) throw new AppError('Mercado Pago no esta configurado', 500)

  if (payload.type !== 'subscription_preapproval') {
    return { processed: false, reason: 'ignored_topic' }
  }

  const preapproval = await mercadoPagoRequest<MercadoPagoPreapprovalResponse>(
    `/preapproval/${encodeURIComponent(dataId)}`,
    { method: 'GET' },
    token,
  )

  if (preapproval.status !== 'authorized') {
    return { processed: false, reason: 'subscription_not_authorized' }
  }

  if (!preapproval.payer_email) {
    throw new AppError('La suscripcion de Mercado Pago no tiene email', 422)
  }

  const planId = preapproval.external_reference
    ? String(preapproval.external_reference)
    : getMercadoPagoPlan().id
  const result = await createOnboardingInvitationFromPayment({
    email: preapproval.payer_email,
    planId,
    paymentProvider: 'mercadopago',
    paymentEventId: preapproval.id,
  })

  return { processed: true, invitationCreated: result.created }
}

export function verifyMercadoPagoWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
}: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret || !xSignature || !xRequestId || !dataId) return false

  const signature = parseMercadoPagoSignature(xSignature)
  if (!signature.ts || !signature.v1) return false

  const normalizedDataId = normalizeMercadoPagoDataId(dataId)
  const manifest = `id:${normalizedDataId};request-id:${xRequestId};ts:${signature.ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signature.v1)
  if (expectedBuffer.length !== receivedBuffer.length) return false

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

function parseMercadoPagoSignature(header: string): Record<string, string> {
  return header.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=')
    if (key && value) acc[key.trim()] = value.trim()
    return acc
  }, {})
}

function normalizeMercadoPagoDataId(dataId: string): string {
  const hasOnlyAlphanumeric = /^[a-z0-9]+$/i.test(dataId)
  return hasOnlyAlphanumeric ? dataId.toLowerCase() : dataId
}

function getPublicAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) throw new AppError('NEXT_PUBLIC_APP_URL no esta configurado', 500)
  return url.replace(/\/$/, '')
}

async function mercadoPagoRequest<T>(
  path: string,
  init: RequestInit,
  accessToken: string,
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  headers.set('Content-Type', 'application/json')

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  })

  if (!res.ok) {
    const details = await readMercadoPagoError(res)
    throw new AppError(`Mercado Pago rechazo la operacion${details}`, res.status)
  }

  return res.json() as Promise<T>
}

async function readMercadoPagoError(res: Response): Promise<string> {
  try {
    const body = await res.json() as { message?: string; error?: string }
    const message = body.message ?? body.error
    return message ? `: ${message}` : ''
  } catch {
    return ''
  }
}
