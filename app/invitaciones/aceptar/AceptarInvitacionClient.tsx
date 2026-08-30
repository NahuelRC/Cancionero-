'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function AceptarInvitacionClient() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token') ?? ''

  const [nombre, setNombre]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) { setError('Token inválido.'); return }
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch('/api/invitaciones/aceptar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, nombre, password }),
      })
      const json = await res.json()

      if (!json.ok) {
        setError(json.message)
        return
      }

      router.push('/login?registered=1')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-[#0b0c0e]">
      <div className="w-[340px] bg-[#1c2026] border border-[#3a3f47] rounded-[14px] p-[30px_26px]">
        <div className="font-serif font-bold text-[22px] text-[#e8a33d] mb-1">Klave</div>
        <p className="text-[12.5px] text-[#8b9099] mb-5">Completá tu cuenta para unirte a la iglesia</p>

        {error && (
          <div className="mb-4 text-[12.5px] text-[#d9694f] bg-[#d9694f]/10 border border-[#d9694f]/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {!token ? (
          <p className="text-[13px] text-[#d9694f]">Link de invitación inválido o expirado.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-[5px]">
              <span className="text-[12px] text-[#8b9099]">Tu nombre</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                minLength={2}
                className="w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] outline-none focus:border-[#e8a33d]"
              />
            </label>
            <label className="flex flex-col gap-[5px]">
              <span className="text-[12px] text-[#8b9099]">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] outline-none focus:border-[#e8a33d]"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full py-[10px] rounded-lg bg-[#e8a33d] text-[#2b1b04] font-medium text-[13.5px] cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
