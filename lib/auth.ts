import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { connectDB } from './db'
import { Usuario } from '@/models/Usuario'
import { normalizeEmail } from '@/lib/super-admin'
import { normalizeRole } from '@/types'
import { googleSignIn, resolveTenantUser, resolveSuperAdminUser, type UsuarioLean } from '@/services/auth-users'
import { getGoogleConfig } from '@/lib/google-config'

const googleConfig = getGoogleConfig()

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

        const normalizedEmail = normalizeEmail(email)
        const usuarios = await Usuario.find({
          email: normalizedEmail,
          activo: true,
        }).lean()

        for (const usuario of usuarios) {
          if (!usuario.passwordHash) continue
          const valid = await compare(password, usuario.passwordHash)
          if (!valid) continue

          const superAdminUser = resolveSuperAdminUser(usuario as UsuarioLean)
          if (superAdminUser) return superAdminUser

          const authUser = await resolveTenantUser(usuario as UsuarioLean)
          if (authUser) return authUser
        }

        return null
      },
    }),

    ...(googleConfig.enabled ? [Google({
      clientId:     googleConfig.clientId!,
      clientSecret: googleConfig.clientSecret!,
    })] : []),
  ],

  callbacks: {
    signIn: googleSignIn,

    async jwt({ token, user }) {
      if (user) {
        token.id          = user.id!
        token.nombre      = user.nombre
        token.rol         = normalizeRole(user.rol) ?? user.rol
        token.iglesiaId   = user.iglesiaId
        token.iglesiaSlug = user.iglesiaSlug
        token.onboardingStatus = user.onboardingStatus
      } else if (token.onboardingStatus === 'PENDING') {
        // Only the database can promote an onboarding session after payment.
        await connectDB()
        const current = await Usuario.findById(token.id).lean()
        if (!current || !current.activo || current.status !== 'ACTIVE') return null
        const resolved = await resolveTenantUser(current as UsuarioLean)
        if (!resolved) return null
        token.iglesiaId = resolved.iglesiaId
        token.iglesiaSlug = resolved.iglesiaSlug
        token.onboardingStatus = resolved.onboardingStatus
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
      session.user.onboardingStatus = token.onboardingStatus
      return session
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: { strategy: 'jwt' },
})
