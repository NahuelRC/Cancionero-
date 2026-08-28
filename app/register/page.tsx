import { Suspense } from 'react'
import RegisterClient from './RegisterClient'

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-[#0b0c0e]" />}>
      <RegisterClient />
    </Suspense>
  )
}
