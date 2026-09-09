import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyWebhookSignature(input: {
  id: string; requestId: string | null; signature: string | null; secret: string
}) {
  if (!input.secret || !input.requestId || !input.signature || !/^[a-zA-Z0-9_-]+$/.test(input.id)) return false
  const parts = Object.fromEntries(input.signature.split(',').map((part) => part.trim().split('=')))
  if (!/^\d+$/.test(parts.ts ?? '') || !/^[a-f0-9]{64}$/i.test(parts.v1 ?? '')) return false
  const manifest = `id:${input.id.toLowerCase()};request-id:${input.requestId};ts:${parts.ts};`
  const expected = createHmac('sha256', input.secret).update(manifest).digest()
  return timingSafeEqual(expected, Buffer.from(parts.v1, 'hex'))
}

export function nextBillingMonth(value: string | Date): Date {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error('Fecha de cobro inválida')
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + 1)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return date
}

export function validMonthlyTerms(
  recurring: { frequency?: number; frequency_type?: string; transaction_amount?: number; currency_id?: string },
  expected: { amount: number; currency: string },
) {
  return recurring.frequency === 1 && recurring.frequency_type === 'months' &&
    Number(recurring.transaction_amount) === expected.amount && recurring.currency_id === expected.currency
}
