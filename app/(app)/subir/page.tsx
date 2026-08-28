'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SongSection, ChordAnnotation, Tonalidad } from '@/types'

const TONOS: Tonalidad[] = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B']

interface ParseResult {
  secciones: SongSection[]
  detectedKey?: Tonalidad
}

export default function SubirPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [dragging, setDragging]   = useState(false)
  const [fileName, setFileName]   = useState<string | null>(null)
  const [parsed, setParsed]       = useState<ParseResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Form fields
  const [titulo, setTitulo]   = useState('')
  const [artista, setArtista] = useState('')
  const [tono, setTono]       = useState<Tonalidad>('C')
  const [bpm, setBpm]         = useState('')
  const [compas, setCompas]   = useState('')
  const [tags, setTags]       = useState('')

  async function processFile(file: File) {
    setError(null)
    setUploading(true)
    setFileName(file.name)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/canciones/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.ok) { setError(json.message); return }
      setParsed(json.data)
      if (json.data.detectedKey) setTono(json.data.detectedKey)
      if (!titulo) setTitulo(file.name.replace(/\.[^.]+$/, ''))
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  // ─── Preview mutation helpers ────────────────────────────────────────────────

  function updateSecciones(fn: (secs: SongSection[]) => SongSection[]) {
    setParsed((prev) => prev ? { ...prev, secciones: fn(prev.secciones) } : prev)
  }

  function removeLineChords(si: number, li: number) {
    updateSecciones((secs) =>
      secs.map((s, i) =>
        i !== si ? s : {
          ...s,
          lines: s.lines.map((l, j) => j !== li ? l : { ...l, chords: [] }),
        },
      ),
    )
  }

  function editChord(si: number, li: number, ci: number, value: string) {
    updateSecciones((secs) =>
      secs.map((s, i) =>
        i !== si ? s : {
          ...s,
          lines: s.lines.map((l, j) =>
            j !== li ? l : {
              ...l,
              chords: l.chords.map((c, k) => k !== ci ? c : { ...c, chord: value }),
            },
          ),
        },
      ),
    )
  }

  function addChordToLine(si: number, li: number, chord: string, position: number) {
    updateSecciones((secs) =>
      secs.map((s, i) =>
        i !== si ? s : {
          ...s,
          lines: s.lines.map((l, j) =>
            j !== li ? l : {
              ...l,
              chords: [...l.chords, { chord, position }].sort((a, b) => a.position - b.position),
            },
          ),
        },
      ),
    )
  }

  // ─── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!parsed || !titulo) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        titulo,
        artista:   artista || undefined,
        tono,
        bpm:       bpm ? Number(bpm) : undefined,
        compas:    compas || undefined,
        secciones: parsed.secciones,
        tags:      tags.split(',').map((t) => t.trim()).filter(Boolean),
      }
      const res  = await fetch('/api/canciones', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.ok) { setError(json.message); return }
      router.push(`/repertorio/${json.data.id}`)
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-[22px] py-4 border-b border-[#3a3f47]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif font-semibold text-[18px] m-0">Subir canción</h2>
            <p className="text-[12px] text-[#8b9099] mt-0.5">Formato Word (.docx) o texto plano (.txt) con acordes sobre la letra</p>
          </div>
          <Link href="/subir/bulk" className="text-[12px] text-[#e8a33d] hover:underline flex-shrink-0">
            📚 Importar cancionero completo →
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] py-[18px]">
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-[1.5px] border-dashed rounded-xl px-5 py-9 text-center cursor-pointer mb-[18px] transition-colors ${
            dragging ? 'border-[#e8a33d] text-[#f4f1e8]' : 'border-[#3a3f47] text-[#8b9099] hover:border-[#e8a33d] hover:text-[#f4f1e8]'
          }`}
        >
          <span className="block text-[26px] mb-2">⇪</span>
          {uploading ? 'Procesando…' : fileName
            ? `Archivo cargado: ${fileName}`
            : 'Arrastrá tu archivo .docx acá, o hacé clic para elegirlo'}
        </div>
        <input ref={fileRef} type="file" accept=".docx,.txt" className="hidden" onChange={handleFileChange} />

        {error && (
          <div className="mb-4 text-[12.5px] text-[#d9694f] bg-[#d9694f]/10 border border-[#d9694f]/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Metadata form */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <Field label="Título *" className="col-span-2">
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Luz que no se apaga" className={inputCls} />
          </Field>
          <Field label="Autor / intérprete">
            <input value={artista} onChange={(e) => setArtista(e.target.value)} placeholder="Ministerio de alabanza" className={inputCls} />
          </Field>
          <Field label="Tonalidad original">
            <select value={tono} onChange={(e) => setTono(e.target.value as Tonalidad)} className="w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] outline-none">
              {TONOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="BPM">
            <input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="96" className={inputCls} />
          </Field>
          <Field label="Compás">
            <input value={compas} onChange={(e) => setCompas(e.target.value)} placeholder="4/4" className={inputCls} />
          </Field>
          <Field label="Etiquetas (separadas por coma)">
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="adoración, rápida" className={inputCls} />
          </Field>
        </div>

        {/* Editable preview */}
        {parsed && (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12.5px] text-[#8b9099]">
                Vista previa — hacé clic en un acorde para editarlo, o × para quitarlos de una línea:
              </p>
            </div>
            <div className="bg-[#1c2026] border border-[#3a3f47] rounded-[10px] p-4 font-mono text-[12.5px] text-[#c9cdd3] leading-relaxed max-h-[420px] overflow-y-auto mb-4 space-y-4">
              {parsed.secciones.map((s, si) => (
                <div key={si}>
                  <div className="text-[#4f8a7b] text-[10.5px] uppercase tracking-wider font-sans mb-1.5">
                    {s.label}
                  </div>
                  {s.lines.map((line, li) => (
                    <EditableLine
                      key={li}
                      text={line.text}
                      chords={line.chords}
                      onRemoveChords={() => removeLineChords(si, li)}
                      onEditChord={(ci, v) => editChord(si, li, ci, v)}
                      onAddChord={(chord, position) => addChordToLine(si, li, chord, position)}
                    />
                  ))}
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !titulo}
              className="px-[22px] py-[10px] rounded-lg bg-[#e8a33d] text-[#2b1b04] font-medium text-[13.5px] cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar canción'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Editable line ────────────────────────────────────────────────────────────

function EditableLine({
  text,
  chords,
  onRemoveChords,
  onEditChord,
  onAddChord,
}: {
  text: string
  chords: ChordAnnotation[]
  onRemoveChords: () => void
  onEditChord: (ci: number, value: string) => void
  onAddChord?: (chord: string, position: number) => void
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue]   = useState('')
  const [adding, setAdding]         = useState(false)
  const [addChord, setAddChord]     = useState('')
  const [addPos, setAddPos]         = useState(0)

  function nextPosition() {
    if (chords.length === 0) return 0
    const last = chords[chords.length - 1]
    return last.position + last.chord.length + 2
  }

  function commitAdd() {
    const trimmed = addChord.trim()
    if (trimmed && onAddChord) {
      onAddChord(trimmed, addPos)
    }
    setAdding(false)
    setAddChord('')
  }

  function startAdding() {
    setAddPos(nextPosition())
    setAddChord('')
    setAdding(true)
  }

  // Build the chord row string for display (non-editing)
  function buildChordRow(): string {
    if (chords.length === 0) return ''
    let row = ''
    for (const c of chords) {
      while (row.length < c.position) row += ' '
      row += c.chord
    }
    return row
  }

  function startEdit(ci: number) {
    setEditingIdx(ci)
    setEditValue(chords[ci].chord)
  }

  function commitEdit() {
    if (editingIdx === null) return
    const trimmed = editValue.trim()
    if (trimmed) onEditChord(editingIdx, trimmed)
    setEditingIdx(null)
  }

  const hasChords = chords.length > 0

  return (
    <div className="group relative whitespace-pre">
      {/* Chord row — only when chords exist */}
      {hasChords && (
        <div className="flex items-start">
          <div className="flex-1 text-[#e8a33d] leading-snug min-h-[1.2em]">
            {(() => {
              const segments: React.ReactNode[] = []
              let cursor = 0
              chords.forEach((c, ci) => {
                if (c.position > cursor) {
                  segments.push(
                    <span key={`pad-${ci}`}>{' '.repeat(c.position - cursor)}</span>,
                  )
                }
                if (editingIdx === ci) {
                  segments.push(
                    <input
                      key={`edit-${ci}`}
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitEdit() }
                        if (e.key === 'Escape') setEditingIdx(null)
                      }}
                      className="inline w-[4ch] bg-[#3a3f47] text-[#e8a33d] outline-none rounded px-0.5 font-mono text-[12.5px]"
                      style={{ width: `${Math.max(3, editValue.length + 1)}ch` }}
                    />,
                  )
                  cursor = c.position + c.chord.length
                } else {
                  segments.push(
                    <button
                      key={`chord-${ci}`}
                      onClick={() => startEdit(ci)}
                      title="Clic para editar"
                      className="text-[#e8a33d] hover:underline hover:text-[#f5c06e] cursor-pointer bg-transparent border-none font-mono text-[12.5px]"
                    >
                      {c.chord}
                    </button>,
                  )
                  cursor = c.position + c.chord.length
                }
              })
              return segments
            })()}
          </div>

          {/* Add chord button (within the chord row when chords exist) */}
          {onAddChord && !adding && (
            <button
              onClick={startAdding}
              title="Agregar acorde a esta línea"
              className="opacity-0 group-hover:opacity-100 ml-1 text-[#4f8a7b] hover:text-[#6ab89e] text-[11px] leading-snug flex-shrink-0 cursor-pointer bg-transparent border-none transition-opacity"
            >
              +
            </button>
          )}

          {/* Remove all chords button */}
          <button
            onClick={onRemoveChords}
            title="Quitar acordes de esta línea"
            className="opacity-0 group-hover:opacity-100 ml-1 text-[#8b9099] hover:text-[#d9694f] text-[11px] leading-snug flex-shrink-0 cursor-pointer bg-transparent border-none transition-opacity"
          >
            ×
          </button>
        </div>
      )}

      {/* Add chord button for lines without chords */}
      {!hasChords && onAddChord && !adding && (
        <button
          onClick={startAdding}
          title="Agregar acorde a esta línea"
          className="opacity-0 group-hover:opacity-100 text-[#4f8a7b] hover:text-[#6ab89e] text-[11px] leading-snug cursor-pointer bg-transparent border-none transition-opacity"
        >
          + acorde
        </button>
      )}

      {/* Inline add-chord form — outside hasChords so it works for any line */}
      {adding && (
        <div className="flex items-center gap-1 mt-0.5">
          <input
            autoFocus
            value={addChord}
            onChange={(e) => setAddChord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitAdd() }
              if (e.key === 'Escape') { setAdding(false) }
            }}
            onBlur={commitAdd}
            placeholder="acorde"
            className="w-[5ch] bg-[#3a3f47] text-[#e8a33d] outline-none rounded px-0.5 font-mono text-[12.5px]"
            style={{ width: `${Math.max(5, addChord.length + 1)}ch` }}
          />
          <span className="text-[#8b9099] text-[10px]">@ pos</span>
          <input
            type="number"
            value={addPos}
            onChange={(e) => setAddPos(Number(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd() }}
            className="w-[5ch] bg-[#3a3f47] text-[#c9cdd3] outline-none rounded px-0.5 font-mono text-[11px]"
          />
        </div>
      )}

      {/* Lyric row */}
      <div className={hasChords ? 'text-[#c9cdd3]' : 'text-[#c9cdd3]'}>
        {text || (hasChords ? '' : <span className="text-[#3a3f47]">{'(línea vacía)'}</span>)}
      </div>
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] outline-none focus:border-[#e8a33d]'

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[12px] text-[#8b9099] mb-[5px]">{label}</label>
      {children}
    </div>
  )
}
