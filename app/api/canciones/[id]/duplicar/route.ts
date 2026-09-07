import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/dal'
import { duplicateCancion } from '@/services/canciones'
import { logAction } from '@/lib/audit'
import { toApiError } from '@/lib/errors'

export async function POST(
  _req: Request,
  ctx: RouteContext<'/api/canciones/[id]/duplicar'>,
) {
  try {
    const { id } = await ctx.params
    const user = await requireTenant(['ADMIN'])
    const cancion = await duplicateCancion(user, id)
    void logAction(user, 'cancion.duplicate', { id: cancion.id, type: 'Cancion', meta: { sourceId: id } })
    return NextResponse.json({ ok: true, data: cancion }, { status: 201 })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
