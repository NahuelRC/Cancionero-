import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenant } from '@/lib/dal'
import { regenerateInvitacion, revokeInvitacion } from '@/services/invitaciones'
import { logAction } from '@/lib/audit'
import { toApiError } from '@/lib/errors'

const PatchSchema = z.object({
  action: z.literal('resend'),
})

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/invitaciones/[id]'>,
) {
  try {
    const { id } = await ctx.params
    const user = await requireTenant(['ADMIN'])
    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Datos invalidos', issues: parsed.error.flatten() }, { status: 422 })
    }

    const invitation = await regenerateInvitacion(user, id)
    void logAction(user, 'invitacion.resend', { id, type: 'Invitacion' })
    return NextResponse.json({ ok: true, data: invitation })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/invitaciones/[id]'>,
) {
  try {
    const { id } = await ctx.params
    const user = await requireTenant(['ADMIN'])
    await revokeInvitacion(user, id)
    void logAction(user, 'invitacion.revoke', { id, type: 'Invitacion' })
    return NextResponse.json({ ok: true, data: null })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
