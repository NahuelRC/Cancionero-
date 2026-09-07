'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function CancionActions({
  id,
  titulo,
  archived = false,
}: {
  id: string
  titulo: string
  archived?: boolean
}) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  async function handleArchiveToggle() {
    setSaving(true)
    try {
      const res = await fetch(`/api/canciones/${id}`, archived
        ? {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'restore' }),
          }
        : { method: 'DELETE' })

      if (res.ok) {
        if (archived) router.refresh()
        else router.push('/repertorio')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const res = await fetch(`/api/canciones/${id}/duplicar`, { method: 'POST' })
      const json = await res.json()
      if (json.ok && json.data?.id) router.push(`/repertorio/${json.data.id}/editar`)
    } finally {
      setDuplicating(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!archived && (
        <>
          <Link
            href={`/repertorio/${id}/editar`}
            className="text-[12px] px-3 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] hover:text-[#f4f1e8] hover:border-[#8b9099]"
          >
            Editar
          </Link>
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="text-[12px] px-3 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] hover:text-[#f4f1e8] hover:border-[#8b9099] cursor-pointer disabled:opacity-60"
          >
            {duplicating ? '...' : 'Duplicar'}
          </button>
        </>
      )}

      {confirm ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11.5px] text-[#d9694f]">
            {archived ? 'Restaurar' : 'Archivar'} &quot;{titulo}&quot;?
          </span>
          <button
            type="button"
            onClick={handleArchiveToggle}
            disabled={saving}
            className={`text-[12px] px-2.5 py-1.5 rounded-lg text-white cursor-pointer disabled:opacity-60 ${archived ? 'bg-[#4f8a7b]' : 'bg-[#d9694f]'}`}
          >
            {saving ? '...' : archived ? 'Si, restaurar' : 'Si, archivar'}
          </button>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            className="text-[12px] px-2.5 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className={`text-[12px] px-3 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] cursor-pointer ${
            archived ? 'hover:text-[#4f8a7b] hover:border-[#4f8a7b]' : 'hover:text-[#d9694f] hover:border-[#d9694f]'
          }`}
        >
          {archived ? 'Restaurar' : 'Archivar'}
        </button>
      )}
    </div>
  )
}
