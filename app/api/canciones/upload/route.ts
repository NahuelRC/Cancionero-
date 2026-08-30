import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/dal'
import { toApiError } from '@/lib/errors'
import { parseDocx, parseTxt } from '@/lib/chords/parser'
import { rateLimit, getIp } from '@/lib/ratelimit'
import { uploadFile } from '@/lib/storage'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  try {
    // 10 uploads per minute per IP
    const rl = rateLimit(`upload:${getIp(req)}`, { limit: 10, windowMs: 60 * 1000 })
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, message: 'Demasiadas solicitudes. Intenta más tarde.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      )
    }
    await requireTenant(['admin', 'musico'])

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ ok: false, message: 'No se envió archivo' }, { status: 422 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, message: 'Archivo demasiado grande (máx 5 MB)' }, { status: 413 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['docx', 'txt'].includes(ext ?? '')) {
      return NextResponse.json({ ok: false, message: 'Solo se aceptan archivos .docx y .txt' }, { status: 422 })
    }

    const ALLOWED_MIME = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/octet-stream', // some browsers send this for .docx
    ]
    if (file.type && !ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ ok: false, message: 'Tipo de archivo no permitido' }, { status: 422 })
    }

    let result
    let archivoUrl: string | null = null

    if (ext === 'docx') {
      const buffer = await file.arrayBuffer()
      result = await parseDocx(buffer)
      // Best-effort: store original in R2 (no-op if storage not configured)
      archivoUrl = await uploadFile(
        `originals/${randomUUID()}-${file.name}`,
        Buffer.from(buffer),
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ).catch(() => null)
    } else {
      const text = await file.text()
      result = parseTxt(text)
      archivoUrl = await uploadFile(
        `originals/${randomUUID()}-${file.name}`,
        Buffer.from(text),
        'text/plain',
      ).catch(() => null)
    }

    return NextResponse.json({ ok: true, data: { ...result, archivoUrl } })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
