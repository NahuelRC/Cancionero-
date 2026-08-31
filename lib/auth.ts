import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { connectDB } from './db'
import { Usuario } from '@/models/Usuario'
import { Iglesia } from '@/models/Iglesia'
import { isTenantRole, normalizeRole, type SessionUser } from '@/types'
import type { IUsuario } from '@/models/Usuario'

type UsuarioLean = Omit<IUsuario, keyof Document> & {
  _id: { toString(): string }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email:      { label: 'Email', type: 'email' },
        password:   { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const { email, password } = credentials as {
          email: string
          password: string
        }

        if (!email || !password) return null

        await connectDB()

        const usuarios = await Usuario.find({
          email: email.toLowerCase(),
          activo: true,
        }).lean()

        for (const usuario of usuarios) {
          if (!usuario.passwordHash) continue
          const valid = await compare(password, usuario.passwordHash)
          if (!valid) continue

          const authUser = await resolveTenantUser(usuario as UsuarioLean)
          if (authUser) return authUser
        }

        return null
      },
    }),

    ...(process.env.AUTH_GOOGLE_ID ? [Google({
      clientId:     process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    })] : []),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const emailVerified = typeof profile?.email_verified === 'boolean'
          ? profile.email_verified
          : true
        if (!emailVerified) return '/login?error=EmailNotVerified'

        await connectDB()

        if (!user.email) return '/login?error=NoAccount'

        const byGoogleId = await Usuario.find({
          activo: true,
          googleId: account.providerAccountId,
        }).limit(2).lean()

        if (byGoogleId.length > 1) return '/login?error=NoAccount'

        let existing = byGoogleId[0] as UsuarioLean | undefined
        if (!existing) {
          const byEmail = await Usuario.find({
            activo: true,
            email: user.email.toLowerCase(),
          }).limit(2).lean()

          if (byEmail.length > 1) return '/login?error=ContactAdmin'
          existing = byEmail[0] as UsuarioLean | undefined
        }

        if (!existing) return '/login?error=PlanRequired'

        const authUser = await resolveTenantUser(existing)
        if (!authUser?.iglesiaId) return '/login?error=NoAccount'

        user.id          = authUser.id
        user.nombre      = authUser.nombre
        user.email       = authUser.email
        user.rol         = authUser.rol
        user.iglesiaId   = authUser.iglesiaId
        user.iglesiaSlug = authUser.iglesiaSlug

        if (!existing.googleId) {
          await Usuario.updateOne(
            { _id: existing._id, iglesiaId: existing.iglesiaId },
            { googleId: account.providerAccountId },
          )
        }
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.id          = user.id!
        token.nombre      = user.nombre
        token.rol         = normalizeRole(user.rol) ?? user.rol
        token.iglesiaId   = user.iglesiaId
        token.iglesiaSlug = user.iglesiaSlug
      }
      return token
    },

    async session({ session, token }) {
      session.user.id          = token.id
      session.user.nombre      = token.nombre
      session.user.email       = token.email!
      session.user.rol         = normalizeRole(token.rol) ?? token.rol
      session.user.iglesiaId   = token.iglesiaId
      session.user.iglesiaSlug = token.iglesiaSlug
      return session
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: { strategy: 'jwt' },
})

async function resolveTenantUser(usuario: UsuarioLean): Promise<SessionUser | null> {
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
