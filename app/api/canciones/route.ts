import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenant } from '@/lib/dal'
import { listCanciones, createCancion } from '@/services/canciones'
import { toApiError } from '@/lib/errors'

const QuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q:        z.string().optional(),
  tags:     z.string().optional(), // comma-separated
  tag:      z.string().optional(), // single tag shorthand
  sort:     z.enum(['reciente', 'titulo', 'artista']).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireTenant()
    const params = Object.fromEntries(req.nextUrl.searchParams)
    const parsed = QuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Parámetros inválidos', issues: parsed.error.flatten() }, { status: 422 })
    }
    const { page, pageSize, q, tags, tag, sort } = parsed.data
    const tagList = [
      ...(tags?.split(',').map((t) => t.trim()).filter(Boolean) ?? []),
      ...(tag ? [tag] : []),
    ]
    const result = await listCanciones(user, { page, pageSize, q, tags: tagList.length ? tagList : undefined, sort })
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}

const CreateSchema = z.object({
  titulo:   z.string().min(1).max(200),
  artista:  z.string().max(100).optional(),
  tono:     z.string().min(1),
  bpm:      z.number().int().min(20).max(300).optional(),
  compas:   z.string().max(10).optional(),
  secciones: z.array(z.object({
    label: z.string().min(1),
    lines: z.array(z.object({
      text:   z.string(),
      chords: z.array(z.object({ chord: z.string(), position: z.number() })).default([]),
    })),
  })).default([]),
  tags: z.array(z.string()).default([]),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireTenant(['admin', 'musico'])
    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 422 })
    }
    const cancion = await createCancion(user, parsed.data as Parameters<typeof createCancion>[1])
    return NextResponse.json({ ok: true, data: cancion }, { status: 201 })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
