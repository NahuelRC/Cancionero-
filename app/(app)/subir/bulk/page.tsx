'use client'

import { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import type { BulkParsedSong } from '@/lib/chords/bulk-parser'

type Step = 'upload' | 'preview' | 'result'

interface SaveResult { saved: number; skipped: number }

export default function BulkSubirPage() {
  const [step, setStep]         = useState<Step>('upload')
  const [songs, setSongs]       = useState<BulkParsedSong[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [result, setResult]     = useState<SaveResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.docx')) {
      setError('Solo se aceptan archivos .docx')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/canciones/bulk-upload', { method: 'POST', body: fd })
      const text = await res.text()
      let json: { ok?: boolean; message?: string; data?: { songs: BulkParsedSong[] } } | null = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        json = null
      }
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? `Error al procesar el archivo (${res.status})`)
        return
      }
      const parsed = json.data?.songs
      if (!Array.isArray(parsed)) {
        setError(`Respuesta inválida del servidor (${res.status})`)
        return
      }
      setSongs(parsed)
      setSelected(new Set(parsed.map((_, i) => i)))
      setStep('preview')
    } catch {
      setError('Error al procesar el archivo')
    } finally {
      setLoading(false)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  // ── Selection ─────────────────────────────────────────────────────────────

  function toggleAll() {
    if (selected.size === songs.length) setSelected(new Set())
    else setSelected(new Set(songs.map((_, i) => i)))
  }

  function toggleOne(i: number) {
    const next = new Set(selected)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    setSelected(next)
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setLoading(true)
    setError(null)
    const toSave = songs
      .filter((_, i) => selected.has(i))
      .map((s) => ({
        titulo:    s.titulo,
        tono:      s.detectedKey ?? 'C',
        secciones: s.secciones,
        tags:      [] as string[],
      }))

    try {
      const res  = await fetch('/api/canciones/bulk-save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ songs: toSave }),
      })
      const json = await res.json()
      if (!json.ok) { setError(json.message); return }
      setResult(json.data)
      setStep('result')
    } catch {
      setError('Error al guardar las canciones')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#101317] px-4 md:px-[22px] py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link href="/subir" className="text-[#8b9099] hover:text-[#c9cdd3] text-[13px] mb-4 inline-block">
            ← Volver
          </Link>
          <h1 className="text-[#f4f1e8] text-[22px] font-semibold">Importar cancionero completo</h1>
          <p className="text-[#8b9099] text-[13px] mt-1">
            Subí un .docx donde cada canción empieza con un título en Heading o negrita
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[#3d1f1f] border border-[#d9694f] text-[#f4a58a] text-[13px]">
            {error}
          </div>
        )}

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-[#3a3f47] hover:border-[#e8a33d] rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors"
          >
            <span className="text-4xl">📄</span>
            <p className="text-[#c9cdd3] text-[14px] font-medium">
              {loading ? 'Procesando...' : 'Arrastrá o hacé clic para seleccionar'}
            </p>
            <p className="text-[#8b9099] text-[12px]">Solo .docx · Máx 10 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between">
              <p className="text-[#c9cdd3] text-[14px]">
                <span className="text-[#e8a33d] font-semibold">{songs.length}</span> canciones detectadas
              </p>
              <p className="text-[#8b9099] text-[12px]">{selected.size} seleccionadas</p>
            </div>

            {/* Select all */}
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-[13px] text-[#c9cdd3] hover:text-[#f4f1e8]"
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${selected.size === songs.length ? 'bg-[#e8a33d] border-[#e8a33d] text-[#101317]' : 'border-[#3a3f47]'}`}>
                {selected.size === songs.length ? '✓' : ''}
              </span>
              {selected.size === songs.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>

            {/* Song list */}
            <div className="border border-[#3a3f47] rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
              {songs.map((song, i) => (
                <button
                  key={i}
                  onClick={() => toggleOne(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-[#2a2f38] last:border-0 ${selected.has(i) ? 'bg-[#1a1f27]' : 'bg-[#101317] opacity-50'}`}
                >
                  <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${selected.has(i) ? 'bg-[#e8a33d] border-[#e8a33d] text-[#101317]' : 'border-[#3a3f47]'}`}>
                    {selected.has(i) ? '✓' : ''}
                  </span>
                  <span className="flex-1 text-[13px] text-[#c9cdd3] truncate">{song.titulo}</span>
                  <span className="text-[11px] text-[#5a6070] flex-shrink-0">
                    {song.secciones.length} secc.
                    {song.detectedKey && <span className="ml-2 text-[#e8a33d]">{song.detectedKey}</span>}
                  </span>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setStep('upload'); setSongs([]); setSelected(new Set()) }}
                className="px-4 py-2 rounded-lg border border-[#3a3f47] text-[#8b9099] text-[13px] hover:text-[#c9cdd3]"
              >
                Cambiar archivo
              </button>
              <button
                onClick={handleSave}
                disabled={loading || selected.size === 0}
                className="flex-1 px-4 py-2 rounded-lg bg-[#e8a33d] text-[#101317] font-semibold text-[13px] hover:bg-[#f5c06e] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Importando...' : `Importar ${selected.size} ${selected.size !== 1 ? 'canciones' : 'canción'}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Result ── */}
        {step === 'result' && result && (
          <div className="text-center space-y-6 py-8">
            <div className="text-5xl">{result.skipped === 0 ? '🎉' : '✅'}</div>
            <div>
              <p className="text-[#f4f1e8] text-[18px] font-semibold">
                {result.saved} {result.saved !== 1 ? 'canciones' : 'canción'} importada{result.saved !== 1 ? 's' : ''}
              </p>
              {result.skipped > 0 && (
                <p className="text-[#8b9099] text-[13px] mt-1">
                  {result.skipped} omitida{result.skipped !== 1 ? 's' : ''} (ya existían)
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Link
                href="/repertorio"
                className="px-5 py-2 rounded-lg bg-[#e8a33d] text-[#101317] font-semibold text-[13px] hover:bg-[#f5c06e]"
              >
                Ver repertorio
              </Link>
              <button
                onClick={() => { setStep('upload'); setSongs([]); setSelected(new Set()); setResult(null) }}
                className="px-5 py-2 rounded-lg border border-[#3a3f47] text-[#8b9099] text-[13px] hover:text-[#c9cdd3]"
              >
                Importar otro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
