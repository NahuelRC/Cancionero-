'use client'

import { useState } from 'react'
import { useLogout } from '@/components/useLogout'

interface Props {
  email: string
  plan: { enabled: boolean; amount: number | null; currency: string }
  subscription: { iglesiaName: string; slug: string; status: string; checkoutUrl: string | null; amount: number } | null
}

export default function OnboardingClient({ email, plan, subscription }: Props) {
  const [iglesiaName, setIglesiaName] = useState(subscription?.iglesiaName ?? '')
  const [slug, setSlug] = useState(subscription?.slug ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { logout, isLoggingOut } = useLogout()
  const amount = subscription?.amount ?? plan.amount

  async function subscribe(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iglesiaName, slug }),
      })
      const body = await response.json()
      if (!response.ok) { setError(body.message ?? 'No pudimos iniciar la suscripción'); return }
      window.location.assign(body.data.checkoutUrl)
    } catch { setError('No pudimos conectar. Intentá nuevamente.') }
    finally { setLoading(false) }
  }

  return <div className="min-h-full flex items-center justify-center bg-[#0b0c0e] px-4 py-10">
    <div className="w-full max-w-[440px] bg-[#1c2026] border border-[#3a3f47] rounded-[14px] p-7">
      <div className="font-serif font-bold text-[22px] text-[#e8a33d]">Klave</div>
      <h1 className="text-xl text-[#f4f1e8] mt-3">Tu iglesia en Klave</h1>
      <p className="text-sm text-[#8b9099] mt-2 mb-5">Cuenta: {email}</p>
      <p className="text-[#f4f1e8] mb-4">Suscripción mensual{amount !== null ? `: ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: plan.currency }).format(amount)} por mes` : ''}.</p>
      {!plan.enabled && <p role="status" className="text-sm text-[#e8a33d] mb-4">Las suscripciones estarán disponibles próximamente. Tu cuenta está guardada; podés volver más adelante para completar el alta.</p>}
      {subscription && <p role="status" className="text-sm text-[#8b9099] mb-4">{subscription.status === 'CANCELLED' ? 'La suscripción fue cancelada. Contactá a soporte para reanudarla.' : 'Estamos esperando la confirmación del primer pago. La autorización de la suscripción puede completarse antes de que se acredite el cobro.'}</p>}
      {error && <p role="alert" className="text-sm text-[#d9694f] mb-4">{error}</p>}
      <form onSubmit={subscribe} className="flex flex-col gap-4">
        <label className="text-sm text-[#8b9099]">Nombre de la iglesia<input required minLength={2} maxLength={100} disabled={Boolean(subscription)} value={iglesiaName} onChange={(e) => setIglesiaName(e.target.value)} className={inputCls} /></label>
        <label className="text-sm text-[#8b9099]">Identificador de la iglesia<input required minLength={2} maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="iglesia-nueva-vida" disabled={Boolean(subscription)} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} className={inputCls} /><span className="text-xs">Letras minúsculas, números y guiones.</span></label>
        <p className="text-xs text-[#8b9099]">Mercado Pago cobrará este importe cada mes hasta que canceles la suscripción. La iglesia se habilita al confirmar el primer pago.</p>
        <button type="submit" disabled={loading || !plan.enabled || subscription?.status === 'CANCELLED'} className="py-3 rounded-lg bg-[#e8a33d] text-[#2b1b04] text-sm font-medium disabled:opacity-60 cursor-pointer">{loading ? 'Preparando suscripción…' : subscription ? 'Continuar en Mercado Pago' : 'Suscribirme con Mercado Pago'}</button>
      </form>
      {subscription && <button type="button" onClick={() => window.location.reload()} className="w-full mt-4 text-sm text-[#4f8a7b] cursor-pointer">Ya completé el pago: consultar estado</button>}
      <button type="button" disabled={isLoggingOut} onClick={logout} className="w-full mt-5 text-sm text-[#8b9099] cursor-pointer">Cerrar sesión</button>
    </div>
  </div>
}
const inputCls = 'w-full mt-1 px-3 py-2 rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] outline-none focus:border-[#e8a33d] disabled:opacity-60'
