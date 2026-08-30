import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/dal'
import { toApiError } from '@/lib/errors'
import { parseBulkDocx } from '@/lib/chords/bulk-parser'
import { rateLimit, getIp } from '@/lib/ratelimit'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`bulk-upload:${getIp(req)}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, message: 'Demasiadas solicitudes. Intenta más tarde.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      )
    }

    await requireTenant(['admin', 'musico'])

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: 'No se envió archivo' }, { status: 422 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, message: 'Archivo demasiado grande (máx 10 MB)' }, { status: 413 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'docx') {
      return NextResponse.json({ ok: false, message: 'Solo se aceptan archivos .docx para importación masiva' }, { status: 422 })
    }

    if (file.type && file.type !== DOCX_MIME && file.type !== 'application/octet-stream') {
      return NextResponse.json({ ok: false, message: 'Tipo de archivo no permitido' }, { status: 422 })
    }

    const buffer = await file.arrayBuffer()
    let songs
    try {
      songs = await parseBulkDocx(buffer)
    } catch (err) {
      console.error('[bulk-upload:parse]', err)
      return NextResponse.json(
        { ok: false, message: 'No se pudo leer el .docx. Verificá que sea un documento Word válido y no esté protegido.' },
        { status: 422 },
      )
    }

    if (songs.length === 0) {
      return NextResponse.json(
        { ok: false, message: 'No se detectaron canciones. Asegurate de que cada título sea un Heading o párrafo en negrita.' },
        { status: 422 },
      )
    }

    return NextResponse.json({ ok: true, data: { songs, total: songs.length } })
  } catch (err) {
    console.error('[bulk-upload]', err)
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
