import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from './auth'
import { connectDB } from './db'
import { Iglesia } from '@/models/Iglesia'
import { Usuario } from '@/models/Usuario'
import {
  isTenantRole,
  normalizeRole,
  type SessionUser,
  type TenantSessionUser,
  type TenantUserRole,
} from '@/types'
import { UnauthorizedError, ForbiddenError } from './errors'

/** Memoized per-request — safe to call multiple times in one render pass. */
export const verifySession = cache(async (): Promise<TenantSessionUser> => {
  const session = await auth()
  if (!session?.user) redirect('/login')

  try {
    return await assertTenantAccess(session.user as SessionUser)
  } catch {
    redirect('/login')
  }
})

/**
 * Use in Server Components and Route Handlers to enforce tenant isolation.
 * Throws UnauthorizedError if not authenticated, ForbiddenError if role mismatch.
 * Throws ForbiddenError if the user, church, or subscription is not active.
 */
export async function requireTenant(allowedRoles?: TenantUserRole[]): Promise<TenantSessionUser> {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()

  return assertTenantAccess(session.user as SessionUser, allowedRoles)
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user?.id) throw new UnauthorizedError()

  const sessionRole = normalizeRole((session.user as SessionUser).rol)
  if (sessionRole !== 'SUPER_ADMIN') throw new ForbiddenError()

  await connectDB()

  const user = await Usuario.findById(
    session.user.id,
    'nombre email rol activo status onboardingStatus',
  ).lean()

  const dbRole = normalizeRole(user?.rol)
  if (!user || dbRole !== 'SUPER_ADMIN' || user.activo === false || user.status !== 'ACTIVE') {
    throw new ForbiddenError('USER_DISABLED')
  }

  return {
    id: user._id.toString(),
    nombre: user.nombre,
    email: user.email,
    rol: 'SUPER_ADMIN',
    iglesiaId: null,
    iglesiaSlug: null,
    status: user.status,
    onboardingStatus: user.onboardingStatus,
  }
}

async function assertTenantAccess(
  sessionUser: SessionUser,
  allowedRoles?: TenantUserRole[],
): Promise<TenantSessionUser> {
  if (!sessionUser.id || !sessionUser.iglesiaId) throw new UnauthorizedError()

  const sessionRole = normalizeRole(sessionUser.rol)
  if (!isTenantRole(sessionRole)) throw new ForbiddenError()

  if (allowedRoles && !allowedRoles.includes(sessionRole)) {
    throw new ForbiddenError()
  }

  await connectDB()

  const [dbUser, iglesia] = await Promise.all([
    Usuario.findOne(
      { _id: sessionUser.id, iglesiaId: sessionUser.iglesiaId },
      'nombre email rol activo status onboardingStatus',
    ).lean(),
    Iglesia.findById(
      sessionUser.iglesiaId,
      'slug status estadoSuscripcion subscriptionStatus',
    ).lean(),
  ])

  const dbRole = normalizeRole(dbUser?.rol)
  if (
    !dbUser ||
    !isTenantRole(dbRole) ||
    dbUser.activo === false ||
    dbUser.status === 'SUSPENDED' ||
    dbUser.status === 'DISABLED'
  ) {
    throw new ForbiddenError('USER_DISABLED')
  }

  if (allowedRoles && !allowedRoles.includes(dbRole)) {
    throw new ForbiddenError()
  }

  if (!iglesia) throw new ForbiddenError('ORGANIZATION_SUSPENDED')

  if (iglesia.status && iglesia.status !== 'ACTIVE') {
    throw new ForbiddenError('ORGANIZATION_SUSPENDED')
  }

  if (
    iglesia.subscriptionStatus && iglesia.subscriptionStatus !== 'ACTIVE' ||
    iglesia.estadoSuscripcion === 'vencida'
  ) {
    throw new ForbiddenError('SUBSCRIPTION_INACTIVE')
  }

  return {
    id: dbUser._id.toString(),
    nombre: dbUser.nombre,
    email: dbUser.email,
    rol: dbRole,
    iglesiaId: sessionUser.iglesiaId,
    iglesiaSlug: iglesia.slug,
    status: dbUser.status ?? 'ACTIVE',
    onboardingStatus: dbUser.onboardingStatus ?? 'COMPLETED',
  }
}
