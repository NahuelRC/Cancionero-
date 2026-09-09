import { Suspense } from 'react'
import LoginClient from './LoginClient'
import { getGoogleConfig } from '@/lib/google-config'

export default function LoginPage() {
  const googleEnabled = getGoogleConfig().enabled

  return (
    <Suspense fallback={<div className="min-h-full bg-[#0b0c0e]" />}>
      <LoginClient googleEnabled={googleEnabled} />
    </Suspense>
  )
}
