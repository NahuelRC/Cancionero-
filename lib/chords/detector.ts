/**
 * Heuristic: a line is a "chord line" if it contains only whitespace + chord tokens
 * and has ≥1 valid chord.
 */

// Matches a chord token: root + optional quality + optional extension(s) + optional bass
// Handles: Em7b5, C7sus4, Cadd9, G#dim7, Bbmaj7, Am7/E
const CHORD_TOKEN =
  /^[A-G][#b]?(?:maj|min|m|M|aug|dim)?(?:sus[24]?)?(?:\d+)?(?:[#b]\d+)*(?:sus[24]?)?(?:add\d+)?(?:\/[A-G][#b]?)?$/

/** Returns true if the line looks like a chord-only line (no lyric text). */
export function isChordLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false

  const tokens = trimmed.split(/\s+/)
  if (tokens.length === 0) return false

  const chordCount = tokens.filter((t) => CHORD_TOKEN.test(t)).length
  // At least half the tokens must be valid chords, and at least one chord present
  return chordCount >= 1 && chordCount / tokens.length >= 0.5
}

/** Extracts all chord tokens from a chord line with their character positions. */
export function extractChordsFromLine(
  line: string,
): Array<{ chord: string; position: number }> {
  const result: Array<{ chord: string; position: number }> = []
  let i = 0

  while (i < line.length) {
    // Skip whitespace
    if (line[i] === ' ' || line[i] === '\t') {
      i++
      continue
    }

    // Find end of token
    let j = i
    while (j < line.length && line[j] !== ' ' && line[j] !== '\t') j++

    const token = line.slice(i, j)
    if (CHORD_TOKEN.test(token)) {
      result.push({ chord: token, position: i })
    }

    i = j
  }

  return result
}

/**
 * Detect the most likely key (tonal center) from a list of chord strings.
 * Very rough heuristic: the most common root note wins.
 */
export function detectKey(chords: string[]): string | null {
  const rootRegex = /^([A-G][#b]?)/
  const counts: Record<string, number> = {}

  for (const chord of chords) {
    const m = chord.match(rootRegex)
    if (m) counts[m[1]] = (counts[m[1]] ?? 0) + 1
  }

  const entries = Object.entries(counts)
  if (!entries.length) return null

  return entries.sort((a, b) => b[1] - a[1])[0][0]
}
