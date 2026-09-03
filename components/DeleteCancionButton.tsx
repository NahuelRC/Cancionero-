'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteCancionButton({ id, titulo }: { id: string; titulo: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Eliminar "${titulo}"?`)) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/canciones/${id}`, { method: 'DELETE' })
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
      title="Eliminar cancion"
      aria-label={`Eliminar ${titulo}`}
      className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-[#3a3f47] text-[#8b9099] hover:text-[#d9694f] hover:border-[#d9694f] cursor-pointer disabled:opacity-60"
    >
      {deleting ? (
        <span aria-hidden="true" className="text-[13px] leading-none">...</span>
      ) : (
        <TrashIcon />
      )}
    </button>
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
