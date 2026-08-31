import mammoth from 'mammoth'
import type { SongSection, Tonalidad } from '@/types'
import { isChordLine, extractChordsFromLine, detectKey } from './detector'

interface ParseResult {
  secciones: SongSection[]
  detectedKey?: Tonalidad
}

const SECTION_LABEL_RE = /^\[?([^\]]{1,30})\]?$/

/** Lines that match common section header patterns. */
function isSectionHeader(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  // e.g. "[Coro]", "VERSO 1", "Puente:", "Intro"
  if (/^\[.+\]$/.test(trimmed)) return true
  if (/^(VERSO|CORO|PUENTE|INTRO|OUTRO|BRIDGE|VERSE|CHORUS|PRE-CORO|FINAL)\b/i.test(trimmed)) return true
  return false
}

/**
 * Parse raw text (from plain-text upload or extracted .docx) into SongSection[].
 * Strategy:
 *  1. Split into lines.
 *  2. Identify section headers.
 *  3. Pair each chord line with the immediately following lyric line.
 *  4. Lines without a preceding chord line become text-only lines.
 */
function parseText(text: string): ParseResult {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n')

  const sections: SongSection[] = []
  let currentSection: SongSection = { label: 'Intro', lines: [] }
  const allChords: string[] = []

  let i = 0
  while (i < rawLines.length) {
    const line = rawLines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }

    if (isSectionHeader(trimmed)) {
      if (currentSection.lines.length > 0) sections.push(currentSection)
      const labelMatch = trimmed.match(SECTION_LABEL_RE)
      currentSection = { label: labelMatch ? labelMatch[1].replace(/[\[\]]/g, '') : trimmed, lines: [] }
      i++
      continue
    }

    if (isChordLine(trimmed)) {
      // Look ahead for a lyric line
      const chords = extractChordsFromLine(line)
      allChords.push(...chords.map((c) => c.chord))

      const nextLine = rawLines[i + 1]?.trim() ?? ''
      const hasLyricNext = nextLine && !isChordLine(nextLine) && !isSectionHeader(nextLine)

      if (hasLyricNext) {
        currentSection.lines.push({ text: rawLines[i + 1].trimEnd(), chords })
        i += 2
      } else {
        // Chord-only line with no lyric — store as empty text
        currentSection.lines.push({ text: '', chords })
        i++
      }
      continue
    }

    // Plain lyric line (no chords)
    currentSection.lines.push({ text: line.trimEnd(), chords: [] })
    i++
  }

  if (currentSection.lines.length > 0) sections.push(currentSection)

  const detectedKey = detectKey(allChords) as Tonalidad | undefined

  return { secciones: sections, detectedKey }
}

/** Parse a .docx Buffer/Uint8Array into SongSection[]. */
export async function parseDocx(buffer: ArrayBuffer): Promise<ParseResult> {
  const { value: text } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
  return parseText(text)
}

/** Parse a plain .txt string into SongSection[]. */
export function parseTxt(text: string): ParseResult {
  return parseText(text)
}
