import 'server-only'
import type { User, Account, Profile } from 'next-auth'
import { connectDB } from '@/lib/db'
import { Usuario, type IUsuario } from '@/models/Usuario'
import { Iglesia } from '@/models/Iglesia'
import { isSuperAdminEmail, normalizeEmail } from '@/lib/super-admin'
import { isTenantRole, normalizeRole, type SessionUser } from '@/types'

export type UsuarioLean = Omit<IUsuario, keyof Document> & { _id: { toString(): string } }

export async function resolveTenantUser(usuario: UsuarioLean): Promise<SessionUser | null> {
  if (
    !usuario.iglesiaId && usuario.onboardingStatus === 'PENDING' &&
    normalizeRole(usuario.rol) === 'ADMIN' && usuario.activo && usuario.status === 'ACTIVE'
  ) {
    return {
      id: usuario._id.toString(), nombre: usuario.nombre, email: usuario.email,
      rol: 'ADMIN', iglesiaId: null, iglesiaSlug: null, onboardingStatus: 'PENDING',
    }
  }
  if (
    !usuario.iglesiaId ||
    usuario.activo === false ||
    usuario.status === 'SUSPENDED' ||
    usuario.status === 'DISABLED'
  ) {
    return null
  }

  const rol = normalizeRole(usuario.rol)
  if (!isTenantRole(rol)) return null

  const iglesia = await Iglesia.findById(usuario.iglesiaId).lean()
  if (
    !iglesia ||
    (iglesia.status && iglesia.status !== 'ACTIVE') ||
    (iglesia.subscriptionStatus && iglesia.subscriptionStatus !== 'ACTIVE') ||
    iglesia.estadoSuscripcion === 'vencida'
    || (iglesia.subscriptionPaidThrough && iglesia.subscriptionPaidThrough <= new Date())
  ) {
    return null
  }

  return {
    id:          usuario._id.toString(),
    nombre:      usuario.nombre,
    email:       usuario.email,
    rol,
    iglesiaId:   usuario.iglesiaId.toString(),
    iglesiaSlug: iglesia.slug,
    status:      usuario.status ?? 'ACTIVE',
    onboardingStatus: usuario.onboardingStatus ?? 'COMPLETED',
  }
}

export function resolveSuperAdminUser(usuario: UsuarioLean): SessionUser | null {
  const rol = normalizeRole(usuario.rol)
  if (
    rol !== 'SUPER_ADMIN' ||
    !isSuperAdminEmail(usuario.email) ||
    usuario.activo === false ||
    usuario.status !== 'ACTIVE'
  ) {
    return null
  }

  return {
    id: usuario._id.toString(),
    nombre: usuario.nombre,
    email: usuario.email,
    rol: 'SUPER_ADMIN',
    iglesiaId: null,
    iglesiaSlug: null,
    status: usuario.status ?? 'ACTIVE',
    onboardingStatus: usuario.onboardingStatus ?? 'COMPLETED',
  }
}

async function getOrCreateSuperAdminFromGoogle(opts: {
  email: string
  nombre: string
  googleId: string
}): Promise<SessionUser> {
  const user = await Usuario.findOneAndUpdate(
    { iglesiaId: null, email: opts.email },
    {
      $setOnInsert: {
        nombre: opts.nombre,
        googleId: opts.googleId,
        rol: 'SUPER_ADMIN',
        activo: true,
        status: 'ACTIVE',
        onboardingStatus: 'COMPLETED',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean()

  const superAdmin = resolveSuperAdminUser(user as UsuarioLean)
  if (!superAdmin) throw new Error('Invalid super admin')
  return superAdmin
}

export async function googleSignIn({ user, account, profile }: {
  user: User; account?: Account | null; profile?: Profile
}): Promise<boolean | string> {
      if (account?.provider === 'google') {
        if (profile?.email_verified !== true) return '/login?error=EmailNotVerified'

        await connectDB()

        if (!user.email) return '/login?error=NoAccount'
        const normalizedEmail = normalizeEmail(user.email)

        if (isSuperAdminEmail(normalizedEmail)) {
          const superAdmin = await getOrCreateSuperAdminFromGoogle({
            email: normalizedEmail,
            nombre: user.name ?? normalizedEmail,
            googleId: account.providerAccountId,
          })

          user.id          = superAdmin.id
          user.nombre      = superAdmin.nombre
          user.email       = superAdmin.email
          user.rol         = superAdmin.rol
          user.iglesiaId   = null
          user.iglesiaSlug = null

          return true
        }

        const byGoogleId = await Usuario.find({
          googleId: account.providerAccountId,
        }).limit(2).lean()

        if (byGoogleId.length > 1) return '/login?error=NoAccount'

        let existing = byGoogleId[0] as UsuarioLean | undefined
        if (!existing) {
          const byEmail = await Usuario.find({
            email: normalizedEmail,
          }).limit(2).lean()

          if (byEmail.length > 1) return '/login?error=ContactAdmin'
          existing = byEmail[0] as UsuarioLean | undefined
        }

        if (!existing) {
          existing = await Usuario.findOneAndUpdate(
            { iglesiaId: null, email: normalizedEmail },
            { $setOnInsert: {
              nombre: user.name ?? normalizedEmail,
              googleId: account.providerAccountId,
              rol: 'ADMIN', activo: true, status: 'ACTIVE', onboardingStatus: 'PENDING',
            } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          ).lean() as UsuarioLean
        }

        if (existing.googleId && existing.googleId !== account.providerAccountId) {
          return '/login?error=ContactAdmin'
        }

        const authUser = await resolveTenantUser(existing)
        if (!authUser) return '/login?error=NoAccount'

        user.id          = authUser.id
        user.nombre      = authUser.nombre
        user.email       = authUser.email
        user.rol         = authUser.rol
        user.iglesiaId   = authUser.iglesiaId
        user.iglesiaSlug = authUser.iglesiaSlug
        user.onboardingStatus = authUser.onboardingStatus

        if (!existing.googleId) {
          await Usuario.updateOne(
            { _id: existing._id, iglesiaId: existing.iglesiaId },
            {
              $set: { googleId: account.providerAccountId },
              // An unverified password signup must not leave a planted password
              // on an account subsequently claimed by its Google email owner.
              ...(existing.onboardingStatus === 'PENDING' ? { $unset: { passwordHash: 1 } } : {}),
            },
          )
        }
      }
      return true
}
