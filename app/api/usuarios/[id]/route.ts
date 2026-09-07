import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenant } from '@/lib/dal'
import { updateUsuarioPerfil, updateUsuarioRol, deactivateUsuario, reactivateUsuario, resetUsuarioPassword } from '@/services/usuarios'
import { logAction } from '@/lib/audit'
import { toApiError } from '@/lib/errors'
import { TENANT_USER_ROLES, normalizeRole } from '@/types'
const PatchSchema = z.object({
  action: z.literal('reset-password').optional(),
  nombre: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().optional(),
  rol: z.preprocess(
    (value) => typeof value === 'string' ? normalizeRole(value) : value,
    z.enum(TENANT_USER_ROLES),
  ).optional(),
  activo: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/usuarios/[id]'>,
) {
  try {
    const { id } = await ctx.params
    const user = await requireTenant(['ADMIN'])
    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 422 })
    }

    if (parsed.data.action === 'reset-password') {
      const result = await resetUsuarioPassword(user, id)
      void logAction(user, 'usuario.password_reset', { id, type: 'Usuario' })
      return NextResponse.json({ ok: true, data: result })
    }

    if (parsed.data.activo === false) {
      await deactivateUsuario(user, id)
      void logAction(user, 'usuario.deactivate', { id, type: 'Usuario' })
      return NextResponse.json({ ok: true, data: null })
    }

    if (parsed.data.activo === true) {
      const updated = await reactivateUsuario(user, id)
      void logAction(user, 'usuario.reactivate', { id, type: 'Usuario' })
      return NextResponse.json({ ok: true, data: updated })
    }

    if (parsed.data.rol) {
      const updated = await updateUsuarioRol(user, id, parsed.data.rol)
      void logAction(user, 'usuario.rol_change', { id, type: 'Usuario', meta: { rol: parsed.data.rol } })
      return NextResponse.json({ ok: true, data: updated })
    }

    if (parsed.data.nombre || parsed.data.email) {
      const updated = await updateUsuarioPerfil(user, id, {
        nombre: parsed.data.nombre,
        email: parsed.data.email,
      })
      void logAction(user, 'usuario.update', { id, type: 'Usuario' })
      return NextResponse.json({ ok: true, data: updated })
    }

    return NextResponse.json({ ok: false, message: 'Nada que actualizar' }, { status: 422 })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
