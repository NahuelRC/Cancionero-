import type { Tonalidad, SongSection, SongLine, ChordAnnotation } from '@/types'

const CHROMATIC_SHARP: Tonalidad[] = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const CHROMATIC_FLAT:  Tonalidad[] = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

const ENHARMONIC: Record<string, Tonalidad> = {
  'Cb': 'B', 'E#': 'F', 'Fb': 'E', 'B#': 'C',
}

function noteToIndex(note: string): number {
  const normalized = ENHARMONIC[note] ?? note
  const idx = CHROMATIC_SHARP.indexOf(normalized as Tonalidad)
  if (idx !== -1) return idx
  return CHROMATIC_FLAT.indexOf(normalized as Tonalidad)
}

function indexToNote(index: number, preferFlats: boolean): Tonalidad {
  const idx = ((index % 12) + 12) % 12
  return preferFlats ? CHROMATIC_FLAT[idx] : CHROMATIC_SHARP[idx]
}

/**
 * Splits a chord string into [root, modifier, bassNote?]
 * e.g. "Am7/E" → ["A", "m7", "E"]
 */
function parseChord(chord: string): { root: string; modifier: string; bass?: string } {
  const slashIdx = chord.indexOf('/')
  let base = chord
  let bass: string | undefined

  if (slashIdx !== -1) {
    base = chord.slice(0, slashIdx)
    bass = chord.slice(slashIdx + 1)
  }

  // Root is 1 or 2 chars: letter + optional # or b
  const match = base.match(/^([A-G][#b]?)(.*)$/)
  if (!match) return { root: chord, modifier: '' }

  return { root: match[1], modifier: match[2], bass }
}

export function transposeChord(chord: string, semitones: number, preferFlats = false): string {
  if (semitones === 0) return chord

  const { root, modifier, bass } = parseChord(chord)
  const rootIdx = noteToIndex(root)
  if (rootIdx === -1) return chord

  const newRoot = indexToNote(rootIdx + semitones, preferFlats)
  let result = newRoot + modifier

  if (bass) {
    const bassIdx = noteToIndex(bass)
    if (bassIdx !== -1) {
      result += '/' + indexToNote(bassIdx + semitones, preferFlats)
    } else {
      result += '/' + bass
    }
  }

  return result
}

export function semitonesBetween(from: Tonalidad, to: Tonalidad): number {
  const fromIdx = noteToIndex(from)
  const toIdx   = noteToIndex(to)
  if (fromIdx === -1 || toIdx === -1) return 0
  return ((toIdx - fromIdx) + 12) % 12
}

function transposeLine(line: SongLine, semitones: number, preferFlats: boolean): SongLine {
  return {
    text: line.text,
    chords: line.chords.map((a: ChordAnnotation) => ({
      chord:    transposeChord(a.chord, semitones, preferFlats),
      position: a.position,
    })),
  }
}

export function transposeSections(
  secciones: SongSection[],
  fromTone: Tonalidad,
  toTone: Tonalidad,
): SongSection[] {
  const semitones = semitonesBetween(fromTone, toTone)
  // Use flat notation for flat-based target keys
  const flatKeys: Tonalidad[] = ['F','Bb','Eb','Ab','Db','Gb']
  const preferFlats = flatKeys.includes(toTone)

  return secciones.map((s) => ({
    label: s.label,
    lines: s.lines.map((l) => transposeLine(l, semitones, preferFlats)),
  }))
}
