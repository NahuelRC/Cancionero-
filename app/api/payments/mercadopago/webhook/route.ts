import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyWebhookSignature } from '@/lib/payments/validation'
import { syncSubscriptionEvent } from '@/services/subscriptions'
import { toApiError } from '@/lib/errors'

export const runtime = 'nodejs'
const EventSchema = z.object({ type: z.string(), data: z.object({ id: z.union([z.string(), z.number()]) }) })

export async function POST(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('data.id') ?? ''
    if (!verifyWebhookSignature({
      id, signature: req.headers.get('x-signature'), requestId: req.headers.get('x-request-id'),
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '',
    })) return NextResponse.json({ ok: false }, { status: 401 })
    const parsed = EventSchema.safeParse(await req.json())
    if (!parsed.success || String(parsed.data.data.id).toLowerCase() !== id.toLowerCase()) {
      return NextResponse.json({ ok: false }, { status: 422 })
    }
    if (['subscription_preapproval', 'subscription_authorized_payment', 'payment'].includes(parsed.data.type)) {
      await syncSubscriptionEvent(parsed.data.type, id)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const { message, statusCode } = toApiError(error)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
