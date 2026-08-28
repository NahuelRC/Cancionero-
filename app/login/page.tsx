import { Suspense } from 'react'
import LoginClient from './LoginClient'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-[#0b0c0e]" />}>
      <LoginClient />
    </Suspense>
  )
}
