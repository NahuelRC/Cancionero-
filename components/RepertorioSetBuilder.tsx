'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { CancionDTO } from '@/types'

export function RepertorioSetBuilder({ canciones }: { canciones: CancionDTO[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedSet = useMemo(() => new Set(selected), [selected])

  function toggle(id: string) {
    setSelected((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ))
  }

  async function createSet() {
    if (selected.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/envivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim() || undefined,
          cancionIds: selected,
        }),
      })
      const json = await res.json()
      if (json.ok) {
        router.push('/en-vivo')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (canciones.length === 0) return null

  return (
    <div className="mb-3 border border-[#3a3f47] bg-[#1c2026] rounded-[10px] p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del set"
          className="min-w-0 flex-1 rounded-lg border border-[#3a3f47] bg-[#262b33] px-3 py-2 text-[12.5px] text-[#f4f1e8] outline-none focus:border-[#e8a33d]"
        />
        <button
          type="button"
          onClick={createSet}
          disabled={selected.length === 0 || loading}
          className="rounded-lg bg-[#e8a33d] px-3 py-2 text-[12.5px] font-medium text-[#2b1b04] disabled:opacity-50"
        >
          {loading ? 'Creando...' : `Crear set (${selected.length})`}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {canciones.map((cancion) => (
          <label
            key={cancion.id}
            className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11.5px] ${
              selectedSet.has(cancion.id)
                ? 'border-[#e8a33d] bg-[#e8a33d]/10 text-[#e8a33d]'
                : 'border-[#3a3f47] text-[#c9cdd3]'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedSet.has(cancion.id)}
              onChange={() => toggle(cancion.id)}
              className="h-3.5 w-3.5 accent-[#e8a33d]"
            />
            <span className="truncate">{cancion.titulo}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
