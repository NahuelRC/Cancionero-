import type { UserRole } from '@/types'

declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string
      nombre: string
      email: string
      rol: UserRole
      iglesiaId?: string | null
      iglesiaSlug?: string | null
      onboardingStatus?: 'PENDING' | 'COMPLETED'
    }
  }

  interface User {
    id?: string
    nombre: string
    email?: string | null
    rol: UserRole
    iglesiaId?: string | null
    iglesiaSlug?: string | null
    onboardingStatus?: 'PENDING' | 'COMPLETED'
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    nombre: string
    rol: UserRole
    iglesiaId?: string | null
    iglesiaSlug?: string | null
    onboardingStatus?: 'PENDING' | 'COMPLETED'
  }
}
