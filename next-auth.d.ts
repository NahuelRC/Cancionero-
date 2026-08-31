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
    }
  }

  interface User {
    id?: string
    nombre: string
    email?: string | null
    rol: UserRole
    iglesiaId?: string | null
    iglesiaSlug?: string | null
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    nombre: string
    rol: UserRole
    iglesiaId?: string | null
    iglesiaSlug?: string | null
  }
}
