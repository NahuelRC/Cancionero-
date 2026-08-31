import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenant } from '@/lib/dal'
import { toApiError } from '@/lib/errors'
import { connectDB } from '@/lib/db'
import { Cancion } from '@/models/Cancion'

const TONALIDADES = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'] as const

const SongSchema = z.object({
  titulo:   z.string().min(1).max(200).trim(),
  artista:  z.string().max(100).trim().optional(),
  tono:     z.enum(TONALIDADES),
  secciones: z.array(z.object({
    label: z.string(),
    lines: z.array(z.object({
      text:   z.string(),
      chords: z.array(z.object({ chord: z.string(), position: z.number() })).optional().default([]),
    })),
  })),
  tags:     z.array(z.string()).optional().default([]),
})

const BulkSaveSchema = z.object({
  songs: z.array(SongSchema).min(1).max(300),
})

export async function POST(req: NextRequest) {
  try {
    const user   = await requireTenant(['ADMIN', 'MUSICIAN'])
    const body   = await req.json()
    const parsed = BulkSaveSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 422 })
    }

    await connectDB()

    const docs = parsed.data.songs.map((s) => ({
      iglesiaId:  user.iglesiaId,
      creadoPor:  user.id,
      titulo:     s.titulo,
      artista:    s.artista,
      tono:       s.tono,
      secciones:  s.secciones,
      tags:       s.tags,
    }))

    let saved  = 0
    let skipped = 0

    try {
      const result = await Cancion.insertMany(docs, { ordered: false })
      saved = result.length
    } catch (err: unknown) {
      // insertMany with ordered:false throws if any doc fails, but still inserts the rest
      const bulkErr = err as { insertedDocs?: unknown[]; writeErrors?: Array<{ code: number }> }
      saved   = bulkErr.insertedDocs?.length ?? 0
      skipped = (bulkErr.writeErrors ?? []).filter((e) => e.code === 11000).length
      // Re-throw if it's not a BulkWriteError (unexpected error)
      if (!bulkErr.writeErrors) throw err
    }

    return NextResponse.json({ ok: true, data: { saved, skipped } })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
