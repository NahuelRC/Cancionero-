import 'server-only'
import { z } from 'zod'
import { AppError } from '@/lib/errors'

export function getMonthlyPlan() {
  const amount = Number(process.env.MERCADOPAGO_MONTHLY_PRICE)
  const validAmount = Number.isFinite(amount) && amount > 0 && Number.isInteger(Math.round(amount * 100)) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const enabled = process.env.MERCADOPAGO_ENABLED === 'true' && validAmount &&
    Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_WEBHOOK_SECRET &&
      process.env.MERCADOPAGO_COLLECTOR_ID) && appUrl.startsWith('https://')
  return { enabled, amount: validAmount ? amount : null, currency: 'ARS' as const }
}

export async function mpRequest<T>(path: string, schema: z.ZodType<T>, body?: unknown, key?: string): Promise<T> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) throw new AppError('Los pagos todavía no están disponibles', 503)
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(key ? { 'X-Idempotency-Key': key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new AppError('No pudimos consultar Mercado Pago. Intentá nuevamente.', 502)
  return schema.parse(await response.json())
}

export const PreapprovalSchema = z.object({
  id: z.string(), external_reference: z.coerce.string(), collector_id: z.coerce.number(),
  status: z.enum(['pending', 'authorized', 'paused', 'cancelled']),
  init_point: z.string().url().optional(), last_modified: z.string().datetime({ offset: true }),
  auto_recurring: z.object({
    frequency: z.number(), frequency_type: z.string(),
    transaction_amount: z.coerce.number(), currency_id: z.string(),
  }),
})
export const InvoiceSchema = z.object({
  id: z.number(), preapproval_id: z.string(), debit_date: z.string(),
  payment: z.object({ id: z.number().nullable().optional(), status: z.string().optional() }).nullable().optional(),
})
export const PaymentSchema = z.object({
  id: z.number(), status: z.string(), transaction_amount: z.number(), currency_id: z.string(),
  collector_id: z.number(), live_mode: z.boolean(), transaction_amount_refunded: z.number().optional(),
})

export function safeCheckoutUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || !['www.mercadopago.com.ar', 'www.mercadopago.com', 'www.mercadopago.com.br'].includes(url.hostname)) {
    throw new AppError('Mercado Pago devolvió un enlace inválido', 502)
  }
  return url.toString()
}
