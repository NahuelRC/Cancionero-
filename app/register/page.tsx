import { Suspense } from 'react'
import RegisterClient from './RegisterClient'

export default function RegisterPage() {
  const directRegisterEnabled = process.env.ALLOW_DIRECT_REGISTER === 'true'
  const checkoutUrl = process.env.NEXT_PUBLIC_CHECKOUT_URL ?? null
  const mercadoPagoEnabled = Boolean(
    process.env.MERCADOPAGO_ACCESS_TOKEN &&
    process.env.MERCADOPAGO_PLAN_PRO_AMOUNT,
  )

  return (
    <Suspense fallback={<div className="min-h-full bg-[#0b0c0e]" />}>
      <RegisterClient
        directRegisterEnabled={directRegisterEnabled}
        checkoutUrl={checkoutUrl}
        mercadoPagoEnabled={mercadoPagoEnabled}
      />
    </Suspense>
  )
}
