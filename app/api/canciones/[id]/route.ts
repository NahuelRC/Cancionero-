import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenant } from '@/lib/dal'
import { getCancion, updateCancion, deleteCancion } from '@/services/canciones'
import { logAction } from '@/lib/audit'
import { toApiError } from '@/lib/errors'
const TONALIDADES = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'] as const

const ChordSchema = z.object({
  chord: z.string().trim().min(1).max(30),
  position: z.number().int().min(0).max(1000),
})

const LineSchema = z.object({
  text: z.string().max(2000),
  chords: z.array(ChordSchema).default([]),
})

const SectionSchema = z.object({
  label: z.string().trim().min(1).max(80),
  lines: z.array(LineSchema).default([]),
})

const PatchSchema = z.object({
  titulo:    z.string().min(1).max(200).optional(),
  artista:   z.string().max(100).optional(),
  tono:      z.enum(TONALIDADES).optional(),
  bpm:       z.number().int().min(20).max(300).optional(),
  compas:    z.string().max(10).optional(),
  secciones: z.array(SectionSchema).optional(),
  tags:      z.array(z.string().trim().min(1).max(40)).optional(),
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
    const user = await requireTenant(['ADMIN'])
    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 422 })
    }
    const cancion = await updateCancion(user, id, parsed.data as Parameters<typeof updateCancion>[2])
    void logAction(user, 'cancion.update', { id, type: 'Cancion' })
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
