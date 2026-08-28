import { Suspense } from 'react'
import AceptarInvitacionClient from './AceptarInvitacionClient'

export default function AceptarInvitacionPage() {
  return (
    <Suspense fallback={<div className="min-h-full flex items-center justify-center bg-[#0b0c0e]" />}>
      <AceptarInvitacionClient />
    </Suspense>
  )
}
