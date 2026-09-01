import { Suspense } from 'react'
import LoginClient from './LoginClient'

export default function LoginPage() {
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

  return (
    <Suspense fallback={<div className="min-h-full bg-[#0b0c0e]" />}>
      <LoginClient googleEnabled={googleEnabled} />
    </Suspense>
  )
}
