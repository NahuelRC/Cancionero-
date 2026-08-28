import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from './auth'
import { connectDB } from './db'
import { Iglesia } from '@/models/Iglesia'
import type { SessionUser } from '@/types'
import { UnauthorizedError, ForbiddenError } from './errors'
import type { UserRole } from '@/types'

/** Memoized per-request — safe to call multiple times in one render pass. */
export const verifySession = cache(async (): Promise<SessionUser> => {
  const session = await auth()
  if (!session?.user?.iglesiaId) redirect('/login')
  return session.user as SessionUser
})

/**
 * Use in Server Components and Route Handlers to enforce tenant isolation.
 * Throws UnauthorizedError if not authenticated, ForbiddenError if role mismatch.
 * Throws ForbiddenError if the church subscription is 'vencida'.
 */
export async function requireTenant(allowedRoles?: UserRole[]): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user?.iglesiaId) throw new UnauthorizedError()

  const user = session.user as SessionUser
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    throw new ForbiddenError()
  }

  // Subscription gate — only blocks when explicitly marked 'vencida'
  // (all existing churches default to 'activa', so this is a no-op until payments ship)
  await connectDB()
  const iglesia = await Iglesia.findById(user.iglesiaId, 'estadoSuscripcion').lean()
  if (iglesia?.estadoSuscripcion === 'vencida') {
    throw new ForbiddenError('Suscripción vencida')
  }

  return user
}
