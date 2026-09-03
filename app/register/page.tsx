import { Suspense } from 'react'
import RegisterClient from './RegisterClient'
import { isDirectRegisterEnabled, isInternalDemoMode } from '@/lib/demo-mode'

export default function RegisterPage() {
  const demoMode = isInternalDemoMode()
  const directRegisterEnabled = isDirectRegisterEnabled()
  const checkoutUrl = process.env.NEXT_PUBLIC_CHECKOUT_URL ?? null
  const mercadoPagoEnabled = Boolean(
    process.env.MERCADOPAGO_ACCESS_TOKEN &&
    process.env.MERCADOPAGO_PLAN_PRO_AMOUNT,
  )

  return (
    <Suspense fallback={<div className="min-h-full bg-[#0b0c0e]" />}>
      <RegisterClient
        demoMode={demoMode}
        directRegisterEnabled={directRegisterEnabled}
        checkoutUrl={checkoutUrl}
        mercadoPagoEnabled={mercadoPagoEnabled}
      />
    </Suspense>
  )
}
