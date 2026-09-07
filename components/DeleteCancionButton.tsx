'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DuplicateCancionButton({ id, titulo }: { id: string; titulo: string }) {
  const router = useRouter()
  const [duplicating, setDuplicating] = useState(false)

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
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={duplicating}
      title="Duplicar cancion"
      aria-label={`Duplicar ${titulo}`}
      className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-[#3a3f47] text-[#8b9099] hover:text-[#f4f1e8] hover:border-[#8b9099] cursor-pointer disabled:opacity-60"
    >
      {duplicating ? (
        <span aria-hidden="true" className="text-[13px] leading-none">...</span>
      ) : (
        <CopyIcon />
      )}
    </button>
  )
}

export function DeleteCancionButton({ id, titulo, archived = false }: { id: string; titulo: string; archived?: boolean }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`${archived ? 'Restaurar' : 'Archivar'} "${titulo}"?`)) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/canciones/${id}`, archived
        ? {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'restore' }),
          }
        : { method: 'DELETE' })
      if (res.ok) router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      title={archived ? 'Restaurar cancion' : 'Archivar cancion'}
      aria-label={`${archived ? 'Restaurar' : 'Archivar'} ${titulo}`}
      className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-[#3a3f47] text-[#8b9099] cursor-pointer disabled:opacity-60 ${
        archived ? 'hover:text-[#4f8a7b] hover:border-[#4f8a7b]' : 'hover:text-[#d9694f] hover:border-[#d9694f]'
      }`}
    >
      {deleting ? (
        <span aria-hidden="true" className="text-[13px] leading-none">...</span>
      ) : archived ? (
        <RestoreIcon />
      ) : (
        <TrashIcon />
      )}
    </button>
  )
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function RestoreIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  )
}
