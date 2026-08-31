'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function CancionActions({ id, titulo }: { id: string; titulo: string }) {
  const router  = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/canciones/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/repertorio')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/repertorio/${id}/editar`}
        className="text-[12px] px-3 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] hover:text-[#f4f1e8] hover:border-[#8b9099]"
      >
        Editar
      </Link>

      {confirm ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[11.5px] text-[#d9694f]">¿Eliminar &quot;{titulo}&quot;?</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-[12px] px-2.5 py-1.5 rounded-lg bg-[#d9694f] text-white cursor-pointer disabled:opacity-60"
          >
            {deleting ? '…' : 'Sí, eliminar'}
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="text-[12px] px-2.5 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="text-[12px] px-3 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] hover:text-[#d9694f] hover:border-[#d9694f] cursor-pointer"
        >
          Eliminar
        </button>
      )}
    </div>
  )
}
