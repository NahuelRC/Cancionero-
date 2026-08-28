import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenant } from '@/lib/dal'
import { listUsuarios } from '@/services/usuarios'
import { inviteUsuario } from '@/services/invitaciones'
import { toApiError } from '@/lib/errors'
import { rateLimit, getIp } from '@/lib/ratelimit'

export async function GET() {
  try {
    const user = await requireTenant(['admin'])
    const usuarios = await listUsuarios(user)
    return NextResponse.json({ ok: true, data: usuarios })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}

const InviteSchema = z.object({
  email: z.string().email(),
  rol:   z.enum(['admin', 'musico', 'multimedia']),
})

export async function POST(req: NextRequest) {
  try {
    // 20 invitations per hour per IP
    const rl = rateLimit(`invite:${getIp(req)}`, { limit: 20, windowMs: 60 * 60 * 1000 })
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, message: 'Demasiadas solicitudes. Intenta más tarde.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      )
    }
    const user = await requireTenant(['admin'])
    const body = await req.json()
    const parsed = InviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 422 })
    }
    await inviteUsuario(user, parsed.data.email, parsed.data.rol)
    return NextResponse.json({ ok: true, data: { message: 'Invitación enviada' } }, { status: 201 })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
