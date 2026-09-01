'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCsrfToken } from 'next-auth/react'

export function useLogout() {
  const router = useRouter()
  const isLogoutInFlight = useRef(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = useCallback(async () => {
    if (isLogoutInFlight.current) return

    isLogoutInFlight.current = true
    setIsLoggingOut(true)

    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Auth-Return-Redirect': '1',
        },
        body: new URLSearchParams({
          csrfToken: csrfToken ?? '',
          callbackUrl: '/login',
        }),
      })

      if (!response.ok) throw new Error(`Sign out failed with ${response.status}`)

      router.replace('/login')
      router.refresh()
    } catch (error) {
      isLogoutInFlight.current = false
      setIsLoggingOut(false)
      console.error('[logout]', error)
    }
  }, [router])

  return { isLoggingOut, logout }
}
