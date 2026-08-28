import 'server-only'
import mammoth from 'mammoth'
import type { SongSection, Tonalidad } from '@/types'
import { parseTxt } from './parser'

export interface BulkParsedSong {
  titulo:      string
  secciones:   SongSection[]
  detectedKey: Tonalidad | null
}

function htmlToText(html: string): string {
  return html
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .trim()
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

/**
 * Parse a multi-song .docx where each song starts with a Heading (h1–h4)
 * or a fully-bold paragraph (<p><strong>…</strong></p>).
 */
export async function parseBulkDocx(buffer: ArrayBuffer): Promise<BulkParsedSong[]> {
  const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) })

  // Match song-title boundaries: heading tags OR fully-bold paragraphs
  // We'll scan with a combined regex and collect ranges
  const TITLE_RE = /<(h[1-4])[^>]*>(.*?)<\/\1>|<p[^>]*><strong>([^<]+)<\/strong><\/p>/gi

  const boundaries: Array<{ index: number; end: number; title: string }> = []
  let m: RegExpExecArray | null

  while ((m = TITLE_RE.exec(html)) !== null) {
    const rawTitle = m[2] ?? m[3] // h-tag content or strong content
    const title = stripTags(rawTitle).trim()
    if (title.length > 0 && title.length <= 120) {
      boundaries.push({ index: m.index, end: m.index + m[0].length, title })
    }
  }

  if (boundaries.length === 0) return []

  const songs: BulkParsedSong[] = []

  for (let i = 0; i < boundaries.length; i++) {
    const { title, end } = boundaries[i]
    const nextStart = boundaries[i + 1]?.index ?? html.length

    const bodyHtml = html.slice(end, nextStart)
    const bodyText = htmlToText(bodyHtml)

    const { secciones, detectedKey } = parseTxt(bodyText)

    songs.push({
      titulo:      title,
      secciones,
      detectedKey: detectedKey ?? null,
    })
  }

  return songs
}
