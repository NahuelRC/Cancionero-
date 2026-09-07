'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DuplicateEnVivoButton({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function duplicate() {
    setLoading(true)
    try {
      const res = await fetch('/api/envivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceSessionId: sessionId }),
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

  return (
    <button
      type="button"
      onClick={duplicate}
      disabled={loading}
      className="px-2.5 py-1.5 rounded-lg border border-[#3a3f47] text-[11.5px] text-[#8b9099] hover:text-[#f4f1e8] hover:border-[#8b9099] disabled:opacity-50"
    >
      {loading ? 'Duplicando...' : 'Duplicar set'}
    </button>
  )
}
