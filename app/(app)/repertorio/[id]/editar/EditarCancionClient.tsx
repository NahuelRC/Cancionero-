'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CancionDTO, Tonalidad } from '@/types'

const TONOS: Tonalidad[] = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B']

const inputCls = 'w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] outline-none focus:border-[#e8a33d]'

export function EditarCancionClient({ cancion }: { cancion: CancionDTO }) {
  const router = useRouter()

  const [titulo, setTitulo]   = useState(cancion.titulo)
  const [artista, setArtista] = useState(cancion.artista ?? '')
  const [tono, setTono]       = useState<Tonalidad>(cancion.tono)
  const [bpm, setBpm]         = useState(cancion.bpm?.toString() ?? '')
  const [compas, setCompas]   = useState(cancion.compas ?? '')
  const [tags, setTags]       = useState(cancion.tags.join(', '))
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSave() {
    if (!titulo.trim()) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        titulo:  titulo.trim(),
        artista: artista.trim() || undefined,
        tono,
        tags:    tags.split(',').map((t) => t.trim()).filter(Boolean),
      }
      if (bpm)    body.bpm    = Number(bpm)
      if (compas) body.compas = compas.trim()

      const res  = await fetch(`/api/canciones/${cancion.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.ok) { setError(json.message); return }
      router.push(`/repertorio/${cancion.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-[22px] py-4 border-b border-[#3a3f47] flex items-center gap-3">
        <Link href={`/repertorio/${cancion.id}`} className="text-[#8b9099] hover:text-[#f4f1e8] text-sm">
          ← Cancelar
        </Link>
        <h2 className="font-serif font-semibold text-[18px] m-0 ml-2">Editar canción</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] py-[18px] max-w-lg">
        {error && (
          <div className="mb-4 text-[12.5px] text-[#d9694f] bg-[#d9694f]/10 border border-[#d9694f]/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Título *" className="col-span-2">
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Autor / intérprete" className="col-span-2">
            <input value={artista} onChange={(e) => setArtista(e.target.value)} placeholder="Ministerio de alabanza" className={inputCls} />
          </Field>
          <Field label="Tonalidad original">
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
          <Field label="Compás">
            <input value={compas} onChange={(e) => setCompas(e.target.value)} placeholder="4/4" className={inputCls} />
          </Field>
          <Field label="Etiquetas (separadas por coma)">
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="adoración, rápida" className={inputCls} />
          </Field>
        </div>

        <p className="text-[12px] text-[#8b9099] mb-4">
          Para modificar letra y acordes, eliminá la canción y volvé a subirla con el archivo corregido.
        </p>

        <button
          onClick={handleSave}
          disabled={saving || !titulo.trim()}
          className="px-[22px] py-[10px] rounded-lg bg-[#e8a33d] text-[#2b1b04] font-medium text-[13.5px] cursor-pointer disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
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
