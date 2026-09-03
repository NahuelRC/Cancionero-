'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CancionDTO, ChordAnnotation, SongLine, SongSection, Tonalidad } from '@/types'

const TONOS: Tonalidad[] = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B']

const inputCls = 'w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] outline-none focus:border-[#e8a33d]'
const smallInputCls = 'px-2 py-1.5 rounded-md border border-[#3a3f47] bg-[#101317] text-[#f4f1e8] text-[12px] outline-none focus:border-[#e8a33d]'
const subtleButtonCls = 'px-2.5 py-1.5 rounded-md border border-[#3a3f47] text-[#8b9099] text-[11.5px] hover:text-[#f4f1e8] hover:border-[#8b9099] cursor-pointer disabled:opacity-40 disabled:cursor-default'

export function EditarCancionClient({ cancion }: { cancion: CancionDTO }) {
  const router = useRouter()

  const [titulo, setTitulo] = useState(cancion.titulo)
  const [artista, setArtista] = useState(cancion.artista ?? '')
  const [tono, setTono] = useState<Tonalidad>(cancion.tono)
  const [bpm, setBpm] = useState(cancion.bpm?.toString() ?? '')
  const [compas, setCompas] = useState(cancion.compas ?? '')
  const [tags, setTags] = useState(cancion.tags.join(', '))
  const [secciones, setSecciones] = useState<SongSection[]>(() => cloneSections(cancion.secciones))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = useMemo(
    () => titulo.trim().length > 0 && secciones.some((section) => section.lines.length > 0),
    [titulo, secciones],
  )

  function updateSection(sectionIdx: number, patch: Partial<SongSection>) {
    setSecciones((prev) =>
      prev.map((section, idx) => idx === sectionIdx ? { ...section, ...patch } : section),
    )
  }

  function updateLine(sectionIdx: number, lineIdx: number, patch: Partial<SongLine>) {
    setSecciones((prev) =>
      prev.map((section, idx) =>
        idx !== sectionIdx
          ? section
          : {
              ...section,
              lines: section.lines.map((line, lineIndex) =>
                lineIndex === lineIdx ? { ...line, ...patch } : line,
              ),
            },
      ),
    )
  }

  function addSection() {
    setSecciones((prev) => [
      ...prev,
      {
        label: `Seccion ${prev.length + 1}`,
        lines: [{ text: '', chords: [] }],
      },
    ])
  }

  function removeSection(sectionIdx: number) {
    setSecciones((prev) => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== sectionIdx))
  }

  function addLine(sectionIdx: number) {
    setSecciones((prev) =>
      prev.map((section, idx) =>
        idx !== sectionIdx
          ? section
          : { ...section, lines: [...section.lines, { text: '', chords: [] }] },
      ),
    )
  }

  function removeLine(sectionIdx: number, lineIdx: number) {
    setSecciones((prev) =>
      prev.map((section, idx) =>
        idx !== sectionIdx || section.lines.length <= 1
          ? section
          : { ...section, lines: section.lines.filter((_, lineIndex) => lineIndex !== lineIdx) },
      ),
    )
  }

  function updateChord(sectionIdx: number, lineIdx: number, chordIdx: number, patch: Partial<ChordAnnotation>) {
    setSecciones((prev) =>
      prev.map((section, idx) =>
        idx !== sectionIdx
          ? section
          : {
              ...section,
              lines: section.lines.map((line, lineIndex) =>
                lineIndex !== lineIdx
                  ? line
                  : {
                      ...line,
                      chords: line.chords.map((chord, chordIndex) =>
                        chordIndex === chordIdx ? { ...chord, ...patch } : chord,
                      ).sort((a, b) => a.position - b.position),
                    },
              ),
            },
      ),
    )
  }

  function addChord(sectionIdx: number, lineIdx: number) {
    setSecciones((prev) =>
      prev.map((section, idx) =>
        idx !== sectionIdx
          ? section
          : {
              ...section,
              lines: section.lines.map((line, lineIndex) =>
                lineIndex !== lineIdx
                  ? line
                  : {
                      ...line,
                      chords: [...line.chords, { chord: 'C', position: nextChordPosition(line.chords) }],
                    },
              ),
            },
      ),
    )
  }

  function removeChord(sectionIdx: number, lineIdx: number, chordIdx: number) {
    setSecciones((prev) =>
      prev.map((section, idx) =>
        idx !== sectionIdx
          ? section
          : {
              ...section,
              lines: section.lines.map((line, lineIndex) =>
                lineIndex !== lineIdx
                  ? line
                  : { ...line, chords: line.chords.filter((_, index) => index !== chordIdx) },
              ),
            },
      ),
    )
  }

  function convertLineToChords(sectionIdx: number, lineIdx: number) {
    setSecciones((prev) =>
      prev.map((section, idx) => {
        if (idx !== sectionIdx) return section

        const currentLine = section.lines[lineIdx]
        const parsedChords = parseLooseChordsFromText(currentLine.text)
        if (parsedChords.length === 0) return section

        if (lineIdx < section.lines.length - 1) {
          const nextLineIdx = lineIdx + 1
          return {
            ...section,
            lines: section.lines
              .map((line, currentIdx) =>
                currentIdx === nextLineIdx
                  ? {
                      ...line,
                      chords: [...line.chords, ...parsedChords].sort((a, b) => a.position - b.position),
                    }
                  : line,
              )
              .filter((_, currentIdx) => currentIdx !== lineIdx),
          }
        }

        return {
          ...section,
          lines: section.lines.map((line, currentIdx) =>
            currentIdx === lineIdx ? { ...line, text: '', chords: parsedChords } : line,
          ),
        }
      }),
    )
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        titulo: titulo.trim(),
        artista: artista.trim() || undefined,
        tono,
        bpm: bpm ? Number(bpm) : undefined,
        compas: compas.trim() || undefined,
        secciones: sanitizeSections(secciones),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      }

      const res = await fetch(`/api/canciones/${cancion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.ok) { setError(json.message); return }
      router.push(`/repertorio/${cancion.id}`)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-[22px] py-4 border-b border-[#3a3f47] flex items-center gap-3">
        <Link href={`/repertorio/${cancion.id}`} className="text-[#8b9099] hover:text-[#f4f1e8] text-sm">
          {'<-'} Cancelar
        </Link>
        <h2 className="font-serif font-semibold text-[18px] m-0 ml-2">Editar cancion</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] py-[18px] max-w-5xl">
        {error && (
          <div className="mb-4 text-[12.5px] text-[#d9694f] bg-[#d9694f]/10 border border-[#d9694f]/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-5 max-w-2xl">
          <Field label="Titulo *" className="col-span-2">
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Autor / interprete" className="col-span-2 sm:col-span-1">
            <input value={artista} onChange={(e) => setArtista(e.target.value)} placeholder="Ministerio de alabanza" className={inputCls} />
          </Field>
          <Field label="Tonalidad original" className="col-span-2 sm:col-span-1">
            <select
              value={tono}
              onChange={(e) => setTono(e.target.value as Tonalidad)}
              className="w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] outline-none"
            >
              {TONOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="BPM">
            <input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="96" className={inputCls} />
          </Field>
          <Field label="Compas">
            <input value={compas} onChange={(e) => setCompas(e.target.value)} placeholder="4/4" className={inputCls} />
          </Field>
          <Field label="Etiquetas" className="col-span-2">
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="adoracion, rapida" className={inputCls} />
          </Field>
        </div>

        <div className="space-y-4 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="m-0 text-[14px] font-medium text-[#f4f1e8]">Secciones</h3>
            <button type="button" onClick={addSection} className={subtleButtonCls}>
              + seccion
            </button>
          </div>

          {secciones.map((section, sectionIdx) => (
            <section key={sectionIdx} className="bg-[#1c2026] border border-[#3a3f47] rounded-[10px] p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-[180px] flex-1 max-w-xs">
                  <label className="block text-[11.5px] text-[#8b9099] mb-1">Seccion</label>
                  <input
                    value={section.label}
                    onChange={(e) => updateSection(sectionIdx, { label: e.target.value })}
                    className={`${smallInputCls} w-full text-[#4f8a7b] uppercase tracking-[0.06em]`}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => addLine(sectionIdx)} className={subtleButtonCls}>
                    + linea
                  </button>
                  {secciones.length > 1 && (
                    <button type="button" onClick={() => removeSection(sectionIdx)} className={subtleButtonCls}>
                      Quitar seccion
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {section.lines.map((line, lineIdx) => (
                  <EditableSongLine
                    key={lineIdx}
                    line={line}
                    canConvert={parseLooseChordsFromText(line.text).length > 0}
                    canRemoveLine={section.lines.length > 1}
                    onTextChange={(text) => updateLine(sectionIdx, lineIdx, { text })}
                    onAddChord={() => addChord(sectionIdx, lineIdx)}
                    onConvert={() => convertLineToChords(sectionIdx, lineIdx)}
                    onRemoveLine={() => removeLine(sectionIdx, lineIdx)}
                    onRemoveAllChords={() => updateLine(sectionIdx, lineIdx, { chords: [] })}
                    onChordChange={(chordIdx, patch) => updateChord(sectionIdx, lineIdx, chordIdx, patch)}
                    onRemoveChord={(chordIdx) => removeChord(sectionIdx, lineIdx, chordIdx)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="px-[22px] py-[10px] rounded-lg bg-[#e8a33d] text-[#2b1b04] font-medium text-[13.5px] cursor-pointer disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

function EditableSongLine({
  line,
  canConvert,
  canRemoveLine,
  onTextChange,
  onAddChord,
  onConvert,
  onRemoveLine,
  onRemoveAllChords,
  onChordChange,
  onRemoveChord,
}: {
  line: SongLine
  canConvert: boolean
  canRemoveLine: boolean
  onTextChange: (text: string) => void
  onAddChord: () => void
  onConvert: () => void
  onRemoveLine: () => void
  onRemoveAllChords: () => void
  onChordChange: (chordIdx: number, patch: Partial<ChordAnnotation>) => void
  onRemoveChord: (chordIdx: number) => void
}) {
  return (
    <div className="rounded-lg border border-[#2f343c] bg-[#14171c] p-3">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <button type="button" onClick={onAddChord} className={subtleButtonCls}>
          + acorde
        </button>
        <button type="button" onClick={onConvert} disabled={!canConvert} className={subtleButtonCls}>
          Usar como acordes
        </button>
        {line.chords.length > 0 && (
          <button type="button" onClick={onRemoveAllChords} className={subtleButtonCls}>
            Quitar acordes
          </button>
        )}
        {canRemoveLine && (
          <button type="button" onClick={onRemoveLine} className={subtleButtonCls}>
            Quitar linea
          </button>
        )}
      </div>

      {line.chords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {line.chords.map((chord, chordIdx) => (
            <div key={chordIdx} className="inline-flex items-center gap-1 rounded-md border border-[#3a3f47] bg-[#262b33] px-2 py-1">
              <input
                value={chord.chord}
                onChange={(e) => onChordChange(chordIdx, { chord: e.target.value })}
                className="w-[6ch] bg-transparent text-[#e8a33d] font-mono text-[12px] outline-none"
                aria-label="Acorde"
              />
              <span className="text-[#8b9099] text-[10px]">@</span>
              <input
                type="number"
                min={0}
                value={chord.position}
                onChange={(e) => onChordChange(chordIdx, { position: Number(e.target.value) })}
                className="w-[5ch] bg-transparent text-[#c9cdd3] font-mono text-[11px] outline-none"
                aria-label="Posicion"
              />
              <button
                type="button"
                onClick={() => onRemoveChord(chordIdx)}
                className="text-[#8b9099] hover:text-[#d9694f] text-[13px] leading-none cursor-pointer"
                aria-label={`Quitar acorde ${chord.chord}`}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={line.text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={Math.max(1, line.text.split('\n').length)}
        className="w-full min-h-[38px] resize-y rounded-md border border-[#3a3f47] bg-[#101317] px-3 py-2 font-mono text-[13px] leading-relaxed text-[#f4f1e8] outline-none focus:border-[#e8a33d]"
      />
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[12px] text-[#8b9099] mb-[5px]">{label}</label>
      {children}
    </div>
  )
}

function cloneSections(sections: SongSection[]): SongSection[] {
  return sections.map((section) => ({
    label: section.label,
    lines: section.lines.map((line) => ({
      text: line.text,
      chords: line.chords.map((chord) => ({ ...chord })),
    })),
  }))
}

function sanitizeSections(sections: SongSection[]): SongSection[] {
  return sections.map((section) => ({
    label: section.label.trim() || 'Seccion',
    lines: section.lines.map((line) => ({
      text: line.text,
      chords: line.chords
        .map((chord) => ({
          chord: chord.chord.trim(),
          position: Math.max(0, Number.isFinite(chord.position) ? Math.round(chord.position) : 0),
        }))
        .filter((chord) => chord.chord.length > 0)
        .sort((a, b) => a.position - b.position),
    })),
  }))
}

function nextChordPosition(chords: ChordAnnotation[]): number {
  if (chords.length === 0) return 0
  const last = [...chords].sort((a, b) => b.position - a.position)[0]
  return last.position + last.chord.length + 2
}

function parseLooseChordsFromText(text: string): ChordAnnotation[] {
  const tokenRe = /(^|[\s/|,;-])([A-Ga-g][#b]?(?:maj|min|m|M|aug|dim)?(?:sus[24]?)?(?:\d+)?(?:[#b]\d+)*(?:sus[24]?)?(?:add\d+)?(?:\/[A-Ga-g][#b]?)?)(?=$|[\s/|,;-])/g
  const chords: ChordAnnotation[] = []
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(text)) !== null) {
    const prefix = match[1] ?? ''
    const rawChord = match[2]
    const position = match.index + prefix.length
    const chord = normalizeChord(rawChord)
    if (chord) chords.push({ chord, position })
  }

  return chords
}

function normalizeChord(rawChord: string): string | null {
  const match = rawChord.trim().match(/^([A-Ga-g])([#b]?)(.*)$/)
  if (!match) return null

  const root = match[1].toUpperCase()
  const accidental = match[2]
  const rest = match[3].replace(/\/([A-Ga-g])([#b]?)/g, (_full, bassRoot: string, bassAccidental: string) =>
    `/${bassRoot.toUpperCase()}${bassAccidental}`,
  )

  return `${root}${accidental}${rest}`
}
