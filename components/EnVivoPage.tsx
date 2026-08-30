'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { SongViewer } from './SongViewer'
import type { EnVivoState, CancionDTO, CancionSinAcordesDTO, SessionUser, Tonalidad } from '@/types'

const TONALIDADES: Tonalidad[] = [
  'C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B',
]

interface Props {
  initialState: EnVivoState
  user: SessionUser
}

type SongData = CancionDTO | CancionSinAcordesDTO | null

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiPatch(op: object): Promise<EnVivoState | null> {
  const res  = await fetch('/api/envivo', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(op),
  })
  const json = await res.json()
  return json.ok ? json.data : null
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EnVivoPage({ initialState, user }: Props) {
  const [evState, setEvState]       = useState<EnVivoState>(initialState)
  const [song, setSong]             = useState<SongData>(null)
  const [loading, setLoading]       = useState(false)
  const [mobileTab, setMobileTab]   = useState<'set' | 'vista'>('set')

  const isAdmin      = user.rol === 'admin'
  const canNavigate  = user.rol !== 'multimedia'
  const { canciones, cancionActivaIdx } = evState

  const fetchState = useCallback(async () => {
    try {
      const res  = await fetch('/api/envivo')
      const json = await res.json()
      if (json.ok) setEvState(json.data as EnVivoState)
    } catch { /* silent */ }
  }, [])

  const loadSong = useCallback(async (cancionId: string, tono: Tonalidad): Promise<SongData> => {
    try {
      const res  = await fetch(`/api/canciones/${cancionId}?tono=${tono}`)
      const json = await res.json()
      return json.ok ? json.data : null
    } catch {
      return null
    }
  }, [])

  // Load song when active index or state changes
  useEffect(() => {
    const item = cancionActivaIdx >= 0 && cancionActivaIdx < canciones.length
      ? canciones[cancionActivaIdx]
      : null
    let cancelled = false

    void (async () => {
      const nextSong = item ? await loadSong(item.cancionId, item.tono) : null
      if (!cancelled) setSong(nextSong)
    })()

    return () => { cancelled = true }
  }, [cancionActivaIdx, canciones, loadSong])

  // Real-time updates via SSE; fall back to polling if EventSource is unavailable
  useEffect(() => {
    if (typeof EventSource === 'undefined') {
      const id = setInterval(fetchState, 8000)
      return () => clearInterval(id)
    }

    let es: EventSource
    let fallbackId: ReturnType<typeof setInterval> | undefined

    function connect() {
      es = new EventSource('/api/envivo/stream')
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as EnVivoState
          setEvState(data)
        } catch { /* ignore malformed frame */ }
      }
      es.onerror = () => {
        es.close()
        // Fall back to polling if SSE fails persistently
        if (!fallbackId) {
          fallbackId = setInterval(fetchState, 8000)
        }
      }
      es.onopen = () => {
        // SSE recovered — stop polling fallback
        if (fallbackId) { clearInterval(fallbackId); fallbackId = undefined }
      }
    }

    connect()
    return () => {
      es?.close()
      if (fallbackId) clearInterval(fallbackId)
    }
  }, [fetchState])

  async function patch(op: object) {
    setLoading(true)
    try {
      const next = await apiPatch(op)
      if (next) setEvState(next)
    } finally {
      setLoading(false)
    }
  }

  // ─── No active session ─────────────────────────────────────────────────────

  if (!evState.activo) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader evState={evState} isAdmin={isAdmin} loading={loading} patch={patch} />
        <div className="flex-1 flex items-center justify-center">
          {isAdmin
            ? <CreateSessionPanel onCreated={setEvState} />
            : <p className="text-[#8b9099] text-[14px]">Sin sesión activa — esperá que el admin inicie una</p>
          }
        </div>
      </div>
    )
  }

  // ─── Active session ────────────────────────────────────────────────────────

  const viewerNode = (
    <div className="flex-1 bg-[#1c2026] border border-[#3a3f47] rounded-xl overflow-hidden flex flex-col">
      {song ? (
        <SongViewer cancion={song} sinAcordes={user.rol === 'multimedia'} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#8b9099] text-[13px] text-center px-6">
          {evState.canciones.length === 0
            ? 'Agregá canciones al set para comenzar'
            : 'Seleccioná una canción del set'}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader evState={evState} isAdmin={isAdmin} loading={loading} patch={patch} />

      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b border-[#3a3f47]">
        {(['set', 'vista'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-[13px] border-b-2 -mb-px transition-colors cursor-pointer ${
              mobileTab === tab
                ? 'border-[#e8a33d] text-[#e8a33d]'
                : 'border-transparent text-[#8b9099]'
            }`}
          >
            {tab === 'set' ? 'Set' : 'Vista'}
          </button>
        ))}
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 overflow-hidden p-[18px_22px] gap-4">
        <SetListPanel
          evState={evState}
          isAdmin={isAdmin}
          canNavigate={canNavigate}
          loading={loading}
          patch={patch}
          onSongSelected={() => setMobileTab('vista')}
        />
        {viewerNode}
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        {mobileTab === 'set' ? (
          <div className="flex-1 overflow-hidden flex flex-col p-4">
            <SetListPanel
              evState={evState}
              isAdmin={isAdmin}
              canNavigate={canNavigate}
              loading={loading}
              patch={patch}
              onSongSelected={() => setMobileTab('vista')}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col p-3">
            {viewerNode}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page header ──────────────────────────────────────────────────────────────

function PageHeader({
  evState, isAdmin, loading, patch,
}: {
  evState: EnVivoState
  isAdmin: boolean
  loading: boolean
  patch: (op: object) => void
}) {
  return (
    <div className="flex items-center justify-between px-[22px] py-4 border-b border-[#3a3f47]">
      <div>
        <h2 className="font-serif font-semibold text-[18px] m-0">
          {evState.activo ? evState.nombre || 'En vivo' : 'En vivo'}
        </h2>
        <p className="text-[12px] text-[#8b9099] mt-0.5">
          {evState.activo
            ? `${fmt(evState.fecha)} · ${evState.canciones.length} ${evState.canciones.length === 1 ? 'canción' : 'canciones'}`
            : 'Sin sesión activa'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {evState.activo && (
          <span className="inline-flex items-center gap-1.5 bg-[#4f8a7b]/15 border border-[#4f8a7b]/40 text-[#4f8a7b] text-[10.5px] font-semibold px-[9px] py-[3px] rounded-full uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4f8a7b]" />
            Activo ahora
          </span>
        )}
        <Link
          href="/en-vivo/historial"
          className="text-[12px] px-3 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] hover:text-[#f4f1e8]"
        >
          Historial
        </Link>
        {isAdmin && evState.activo && (
          <button
            onClick={() => patch({ op: 'stop' })}
            disabled={loading}
            className="text-[12px] px-3 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] hover:text-[#d9694f] hover:border-[#d9694f] cursor-pointer disabled:opacity-50"
          >
            Finalizar sesión
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Create session panel ─────────────────────────────────────────────────────

function CreateSessionPanel({ onCreated }: { onCreated: (s: EnVivoState) => void }) {
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha]   = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    setSaving(true)
    try {
      const res  = await fetch('/api/envivo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre: nombre || 'Sesión', fecha }),
      })
      const json = await res.json()
      if (json.ok) onCreated(json.data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-sm bg-[#1c2026] border border-[#3a3f47] rounded-xl p-6">
      <h3 className="font-serif font-semibold text-[16px] mb-4">Nueva sesión</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-[12px] text-[#8b9099] mb-1">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Servicio dominical"
            className="w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] outline-none focus:border-[#e8a33d]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-[#8b9099] mb-1">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] outline-none focus:border-[#e8a33d]"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="w-full px-4 py-[10px] rounded-lg bg-[#e8a33d] text-[#2b1b04] font-medium text-[13.5px] cursor-pointer disabled:opacity-60"
        >
          {saving ? 'Creando…' : 'Iniciar sesión'}
        </button>
      </div>
    </div>
  )
}

// ─── Set list panel ───────────────────────────────────────────────────────────

function SetListPanel({
  evState, isAdmin, canNavigate, loading, patch, onSongSelected,
}: {
  evState: EnVivoState
  isAdmin: boolean
  canNavigate: boolean
  loading: boolean
  patch: (op: object) => void
  onSongSelected?: () => void
}) {
  const [search, setSearch]     = useState('')
  const [results, setResults]   = useState<Array<{ id: string; titulo: string; artista?: string; tono: Tonalidad }>>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearchChange(q: string) {
    setSearch(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch(`/api/canciones?q=${encodeURIComponent(q)}&pageSize=8`)
        const json = await res.json()
        if (json.ok) setResults(json.data.data)
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  function addSong(id: string) {
    patch({ op: 'addCancion', cancionId: id })
    setSearch('')
    setResults([])
  }

  const { canciones, cancionActivaIdx } = evState

  return (
    <div className="w-[260px] flex-shrink-0 flex flex-col overflow-hidden">
      <div className="text-[11px] text-[#8b9099] font-medium uppercase tracking-wider mb-2">
        Set del evento
      </div>

      {/* Song list */}
      <div className="flex-1 overflow-y-auto space-y-1 mb-3">
        {canciones.length === 0 && (
          <p className="text-[12px] text-[#8b9099] py-2">
            {isAdmin ? 'Buscá una canción para agregar' : 'El set está vacío'}
          </p>
        )}
        {canciones.map((item, idx) => {
          const isActive = idx === cancionActivaIdx
          return (
            <div
              key={`${item.cancionId}-${idx}`}
              className={`flex items-center gap-2 rounded-[10px] p-[7px_8px] border transition-colors ${
                isActive ? 'border-[#e8a33d] bg-[#e8a33d]/5' : 'border-[#3a3f47] bg-[#1c2026]'
              }`}
            >
              {/* Number */}
              <div className={`w-[20px] h-[20px] rounded-[5px] bg-[#262b33] flex items-center justify-center text-[10px] font-mono flex-shrink-0 ${isActive ? 'text-[#e8a33d]' : 'text-[#8b9099]'}`}>
                {idx + 1}
              </div>

              {/* Title + key — clickable for navigation */}
              <button
                onClick={() => {
                  if (canNavigate || isAdmin) {
                    patch({ op: 'setActive', idx })
                    onSongSelected?.()
                  }
                }}
                disabled={(!canNavigate && !isAdmin) || loading}
                className="flex-1 text-left min-w-0 cursor-pointer disabled:cursor-default"
              >
                <p className="text-[12.5px] m-0 leading-tight truncate">{item.titulo}</p>
                {!isAdmin && (
                  <p className="text-[10px] text-[#8b9099] m-0 mt-0.5">{item.tono}{item.artista ? ` · ${item.artista}` : ''}</p>
                )}
              </button>

              {/* Tono selector — admin only */}
              {isAdmin && (
                <select
                  value={item.tono}
                  onChange={(e) => patch({ op: 'setTono', idx, tono: e.target.value as Tonalidad })}
                  disabled={loading}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#262b33] border border-[#3a3f47] text-[#e8a33d] text-[10px] rounded-md px-1 py-0.5 outline-none flex-shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {TONALIDADES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}

              {/* Admin controls */}
              {isAdmin && (
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => idx > 0 && patch({ op: 'moveCancion', fromIdx: idx, toIdx: idx - 1 })}
                    disabled={idx === 0 || loading}
                    className="w-4 h-4 rounded text-[#8b9099] hover:text-[#f4f1e8] text-[9px] leading-none disabled:opacity-20 cursor-pointer"
                    title="Subir"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => idx < canciones.length - 1 && patch({ op: 'moveCancion', fromIdx: idx, toIdx: idx + 1 })}
                    disabled={idx === canciones.length - 1 || loading}
                    className="w-4 h-4 rounded text-[#8b9099] hover:text-[#f4f1e8] text-[9px] leading-none disabled:opacity-20 cursor-pointer"
                    title="Bajar"
                  >
                    ▼
                  </button>
                </div>
              )}
              {isAdmin && (
                <button
                  onClick={() => patch({ op: 'removeCancion', idx })}
                  disabled={loading}
                  className="text-[#8b9099] hover:text-[#d9694f] text-[12px] leading-none flex-shrink-0 cursor-pointer disabled:opacity-40"
                  title="Quitar"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Song search (admin only) */}
      {isAdmin && (
        <div className="relative">
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="+ Buscar canción para agregar…"
            className="w-full px-[10px] py-[8px] rounded-lg border border-[#3a3f47] bg-[#1c2026] text-[#f4f1e8] text-[12px] outline-none focus:border-[#4f8a7b] placeholder:text-[#8b9099]"
          />
          {(searching || results.length > 0) && (
            <div className="absolute bottom-full mb-1 w-full bg-[#262b33] border border-[#3a3f47] rounded-lg overflow-hidden shadow-lg z-10">
              {searching && <p className="text-[12px] text-[#8b9099] px-3 py-2">Buscando…</p>}
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => addSong(r.id)}
                  className="w-full text-left px-3 py-2 hover:bg-[#3a3f47] text-[12.5px] cursor-pointer border-b border-[#3a3f47] last:border-0"
                >
                  <span className="block">{r.titulo}</span>
                  <span className="text-[10.5px] text-[#8b9099]">{r.tono}{r.artista ? ` · ${r.artista}` : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
