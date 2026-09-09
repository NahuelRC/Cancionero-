'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function RegisterClient({ googleEnabled }: { googleEnabled: boolean }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function register(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password }),
      })
      const body = await response.json()
      if (!response.ok) { setError(body.message ?? 'No pudimos crear tu cuenta'); return }
      const result = await signIn('credentials', { email, password, redirect: false })
      window.location.assign(result?.ok && !result.error ? '/onboarding' : '/login?registered=1')
    } catch {
      setError('No pudimos conectar. Intentá nuevamente; si tu cuenta ya se creó, iniciá sesión.')
    } finally { setLoading(false) }
  }

  async function google() {
    setLoading(true)
    setError(null)
    try { await signIn('google', { redirectTo: '/' }) }
    catch { setError('No pudimos iniciar el registro con Google. Intentá nuevamente.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-[#0b0c0e] px-4 py-10">
      <div className="w-full max-w-[400px] bg-[#1c2026] border border-[#3a3f47] rounded-[14px] p-7">
        <div className="font-serif font-bold text-[22px] text-[#e8a33d]">Klave</div>
        <h1 className="text-xl text-[#f4f1e8] mt-3">Creá tu cuenta</h1>
        <p className="text-sm text-[#8b9099] mt-2 mb-5">Después completás los datos de tu iglesia y contratás la suscripción mensual. Crear tu cuenta no genera ningún cobro.</p>
        {error && <p role="alert" className="text-sm text-[#d9694f] mb-4">{error}</p>}
        {googleEnabled && <button type="button" disabled={loading} onClick={google} className={buttonCls + ' mb-5'}>Registrarme con Google</button>}
        <form onSubmit={register} className="flex flex-col gap-3">
          <label className={labelCls}>Tu nombre<input autoComplete="name" required minLength={2} maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} /></label>
          <label className={labelCls}>Email<input autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></label>
          <label className={labelCls}>Contraseña (mín. 8 caracteres)<input autoComplete="new-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} /></label>
          <button type="submit" disabled={loading} className={buttonCls}>{loading ? 'Creando cuenta…' : 'Crear cuenta'}</button>
        </form>
        <p className="text-center text-sm text-[#8b9099] mt-5">¿Ya tenés cuenta? <Link href="/login" className="text-[#4f8a7b]">Iniciar sesión</Link></p>
      </div>
    </div>
  )
}
const inputCls = 'w-full mt-1 px-3 py-2 rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] outline-none focus:border-[#e8a33d]'
const labelCls = 'text-sm text-[#8b9099]'
const buttonCls = 'w-full py-3 px-3 rounded-lg bg-[#e8a33d] text-[#2b1b04] font-medium text-sm cursor-pointer disabled:opacity-60'
