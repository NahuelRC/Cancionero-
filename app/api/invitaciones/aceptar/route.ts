import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { acceptInvitacion } from '@/services/invitaciones'
import { toApiError } from '@/lib/errors'

const Schema = z.object({
  token:    z.string().min(64).max(64),
  nombre:   z.string().min(2).max(100),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 422 })
    }
    const { iglesiaSlug } = await acceptInvitacion(
      parsed.data.token,
      parsed.data.nombre,
      parsed.data.password,
    )
    return NextResponse.json({ ok: true, data: { iglesiaSlug } })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
