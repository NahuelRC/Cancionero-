import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createOnboardingInvitationFromPayment } from '@/services/onboarding'
import { toApiError } from '@/lib/errors'

export const runtime = 'nodejs'

const BodySchema = z.object({
  eventId: z.string().min(8).max(200),
  provider: z.string().min(2).max(50),
  email: z.string().email(),
  planId: z.string().min(1).max(100),
})

function hasValidWebhookSecret(req: NextRequest): boolean {
  const expected = process.env.PAYMENT_WEBHOOK_SECRET
  const received = req.headers.get('x-klave-webhook-secret')

  if (!expected || !received) return false

  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)
  if (expectedBuffer.length !== receivedBuffer.length) return false

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

export async function POST(req: NextRequest) {
  try {
    if (!hasValidWebhookSecret(req)) {
      return NextResponse.json({ ok: false, message: 'UNAUTHORIZED' }, { status: 401 })
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'Datos invalidos', issues: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const result = await createOnboardingInvitationFromPayment({
      email: parsed.data.email,
      planId: parsed.data.planId,
      paymentProvider: parsed.data.provider,
      paymentEventId: parsed.data.eventId,
    })

    return NextResponse.json({ ok: true, data: { processed: result.created } })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
