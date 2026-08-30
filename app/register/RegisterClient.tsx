'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export default function RegisterClient() {
  const router = useRouter()

  const [iglesiaName, setIglesiaName] = useState('')
  const [slug, setSlug]               = useState('')
  const [slugManual, setSlugManual]   = useState(false)
  const [nombre, setNombre]           = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  function handleIglesiaNameChange(val: string) {
    setIglesiaName(val)
    if (!slugManual) setSlug(slugify(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res  = await fetch('/api/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ iglesiaName, slug, nombre, email, password }),
      })
      const json = await res.json()

      if (!json.ok) {
        setError(json.message ?? 'Error al crear la cuenta')
        return
      }

      router.push('/login?registered=1')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-[#0b0c0e] py-10">
      <div className="w-[380px] bg-[#1c2026] border border-[#3a3f47] rounded-[14px] p-[30px_26px]">
        <div className="font-serif font-bold text-[22px] text-[#e8a33d] mb-1">Klave</div>
        <p className="text-[12.5px] text-[#8b9099] mb-5">Registrá tu iglesia — es gratis</p>

        {error && (
          <div className="mb-4 text-[12.5px] text-[#d9694f] bg-[#d9694f]/10 border border-[#d9694f]/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {/* ── Iglesia ────────────────────────────────────── */}
          <div className="text-[11px] font-medium text-[#8b9099] uppercase tracking-wider mt-1 mb-0.5">
            Tu iglesia
          </div>

          <label className="flex flex-col gap-[5px]">
            <span className="text-[12px] text-[#8b9099]">Nombre de la iglesia</span>
            <input
              value={iglesiaName}
              onChange={(e) => handleIglesiaNameChange(e.target.value)}
              placeholder="Iglesia Nueva Vida"
              required
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-[5px]">
            <span className="text-[12px] text-[#8b9099]">
              Slug (URL de acceso){' '}
              <span className="text-[#3a3f47] font-mono">klave.app/<span className="text-[#e8a33d]">{slug || '…'}</span></span>
            </span>
            <input
              value={slug}
              onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugManual(true) }}
              placeholder="iglesia-nueva-vida"
              required
              pattern="[a-z0-9-]+"
              title="Solo letras minúsculas, números y guiones"
              className={inputCls + ' font-mono'}
            />
            <span className="text-[11px] text-[#8b9099]">Solo letras minúsculas, números y guiones</span>
          </label>

          {/* ── Administrador ──────────────────────────────── */}
          <div className="text-[11px] font-medium text-[#8b9099] uppercase tracking-wider mt-2 mb-0.5">
            Tu cuenta de administrador
          </div>

          <label className="flex flex-col gap-[5px]">
            <span className="text-[12px] text-[#8b9099]">Tu nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="María García"
              required
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-[5px]">
            <span className="text-[12px] text-[#8b9099]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@iglesia.org"
              required
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-[5px]">
            <span className="text-[12px] text-[#8b9099]">Contraseña (mín. 8 caracteres)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className={inputCls}
            />
          </label>

          <button
            type="submit"
            disabled={loading || !slug}
            className="mt-2 w-full py-[10px] rounded-lg bg-[#e8a33d] text-[#2b1b04] font-medium text-[13.5px] cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Creando cuenta…' : 'Crear iglesia y cuenta admin'}
          </button>
        </form>

        <p className="text-center text-[12px] text-[#8b9099] mt-4">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-[#4f8a7b]">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] outline-none focus:border-[#e8a33d]'
