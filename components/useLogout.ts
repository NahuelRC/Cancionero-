'use client'

import { useCallback, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'

export function useLogout() {
  const isLogoutInFlight = useRef(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = useCallback(async () => {
    if (isLogoutInFlight.current) return

    isLogoutInFlight.current = true
    setIsLoggingOut(true)

    try {
      await signOut({ redirect: false, redirectTo: '/login' })
      // Discard cached authenticated routes and close live connections.
      window.location.replace('/login')
    } catch (error) {
      isLogoutInFlight.current = false
      setIsLoggingOut(false)
      console.error('[logout]', error)
    }
  }, [])

  return { isLoggingOut, logout }
}
