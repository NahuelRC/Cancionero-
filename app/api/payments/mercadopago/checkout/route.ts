import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createMercadoPagoCheckout } from '@/lib/mercadopago'
import { toApiError } from '@/lib/errors'

export const runtime = 'nodejs'

const BodySchema = z.object({
  email: z.string().email(),
  planId: z.string().min(1).max(100).optional(),
})

export async function POST(req: Request) {
  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'Datos invalidos', issues: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const checkout = await createMercadoPagoCheckout(parsed.data)
    return NextResponse.json({ ok: true, data: checkout })
  } catch (err) {
    const { message, statusCode, issues } = toApiError(err)
    return NextResponse.json({ ok: false, message, issues }, { status: statusCode })
  }
}
