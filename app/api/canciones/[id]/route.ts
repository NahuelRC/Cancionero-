import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenant } from '@/lib/dal'
import { getCancion, updateCancion, deleteCancion } from '@/services/canciones'
import { logAction } from '@/lib/audit'
import { toApiError } from '@/lib/errors'
const PatchSchema = z.object({
  titulo:    z.string().min(1).max(200).optional(),
  artista:   z.string().max(100).optional(),
  tono:      z.string().optional(),
  bpm:       z.number().int().min(20).max(300).optional(),
  compas:    z.string().max(10).optional(),
  secciones: z.array(z.any()).optional(),
  tags:      z.array(z.string()).optional(),
})

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/canciones/[id]'>,
) {
  try {
    const { id } = await ctx.params
    const user = await requireTenant()
    const tono = req.nextUrl.searchParams.get('tono') ?? undefined
    const cancion = await getCancion(user, id, tono as Parameters<typeof getCancion>[2])
    return NextResponse.json({ ok: true, data: cancion })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/canciones/[id]'>,
) {
  try {
    const { id } = await ctx.params
    const user = await requireTenant(['ADMIN', 'MUSICIAN'])
    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 422 })
    }
    const cancion = await updateCancion(user, id, parsed.data as Parameters<typeof updateCancion>[2])
    return NextResponse.json({ ok: true, data: cancion })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/canciones/[id]'>,
) {
  try {
    const { id } = await ctx.params
    const user = await requireTenant(['ADMIN'])
    await deleteCancion(user, id)
    void logAction(user, 'cancion.delete', { id, type: 'Cancion' })
    return NextResponse.json({ ok: true, data: null })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
