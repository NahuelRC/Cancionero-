'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam      = searchParams.get('error')
  const registeredParam = searchParams.get('registered')

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(
    errorParam === 'NoAccount'
      ? 'No pudimos habilitar el acceso para esta cuenta.'
      : errorParam === 'PlanRequired'
        ? 'Para crear una nueva iglesia primero necesitás contratar un plan.'
        : errorParam === 'ContactAdmin'
          ? 'Esta cuenta necesita revisión antes de ingresar. Contactá al administrador.'
          : errorParam === 'EmailNotVerified'
            ? 'Tu cuenta de Google no tiene el email verificado.'
        : null
  )
  const registered = registeredParam === '1'

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (res?.error) {
        setError('Email o contraseña incorrectos.')
      } else {
        router.push('/en-vivo')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setLoading(true)
    try {
      await signIn('google', { callbackUrl: '/en-vivo' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-[#0b0c0e]">
      <div className="w-[340px] bg-[#1c2026] border border-[#3a3f47] rounded-[14px] p-[30px_26px]">
        <div className="font-serif font-bold text-[22px] text-[#e8a33d] mb-1">Klave</div>
        <p className="text-[12.5px] text-[#8b9099] mb-5">Iniciá sesión con tu cuenta</p>

        {registered && (
          <div className="mb-4 text-[12.5px] text-[#4f8a7b] bg-[#4f8a7b]/10 border border-[#4f8a7b]/30 rounded-lg px-3 py-2">
            Cuenta creada. Iniciá sesión para continuar.
          </div>
        )}
        {error && (
          <div className="mb-4 text-[12.5px] text-[#d9694f] bg-[#d9694f]/10 border border-[#d9694f]/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleCredentials} className="flex flex-col gap-3">
          <label className="flex flex-col gap-[5px]">
            <span className="text-[12px] text-[#8b9099]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@iglesia.org"
              required
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
              className="w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] outline-none focus:border-[#e8a33d]"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-[10px] rounded-lg bg-[#e8a33d] text-[#2b1b04] font-medium text-[13.5px] cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="flex items-center gap-[10px] my-4 text-[#8b9099] text-[11px]">
          <span className="flex-1 h-px bg-[#3a3f47]" />
          o
          <span className="flex-1 h-px bg-[#3a3f47]" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-[10px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13.5px] cursor-pointer hover:bg-[#2e333b] disabled:opacity-60"
        >
          <GoogleIcon />
          Continuar con Google
        </button>

        <p className="text-center text-[12px] text-[#8b9099] mt-4">
          ¿Administrador sin cuenta de iglesia?{' '}
          <Link href="/register" className="text-[#4f8a7b]">Ver planes</Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
