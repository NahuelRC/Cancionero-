import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { connectDB } from './db'
import { Usuario } from '@/models/Usuario'
import { Iglesia } from '@/models/Iglesia'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email:      { label: 'Email', type: 'email' },
        password:   { label: 'Contraseña', type: 'password' },
        iglesiaSlug: { label: 'Iglesia', type: 'text' },
      },
      async authorize(credentials) {
        const { email, password, iglesiaSlug } = credentials as {
          email: string
          password: string
          iglesiaSlug: string
        }

        if (!email || !password || !iglesiaSlug) return null

        await connectDB()

        const iglesia = await Iglesia.findOne({ slug: iglesiaSlug }).lean()
        if (!iglesia) return null

        const usuario = await Usuario.findOne({
          iglesiaId: iglesia._id,
          email: email.toLowerCase(),
          activo: true,
        }).lean()

        if (!usuario || !usuario.passwordHash) return null

        const valid = await compare(password, usuario.passwordHash)
        if (!valid) return null

        return {
          id:          usuario._id.toString(),
          nombre:      usuario.nombre,
          email:       usuario.email,
          rol:         usuario.rol,
          iglesiaId:   iglesia._id.toString(),
          iglesiaSlug: iglesia.slug,
        }
      },
    }),

    ...(process.env.AUTH_GOOGLE_ID ? [Google({
      clientId:     process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    })] : []),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Google sign-in: look up the user by googleId or email
      if (account?.provider === 'google') {
        await connectDB()
        const existing = await Usuario.findOne({
          $or: [{ googleId: account.providerAccountId }, { email: user.email }],
          activo: true,
        }).lean()

        if (!existing) return '/login?error=NoAccount'

        const iglesia = await Iglesia.findById(existing.iglesiaId).lean()
        if (!iglesia) return '/login?error=NoAccount'

        // Attach custom fields to user so jwt callback can read them
        user.id          = existing._id.toString()
        user.nombre      = existing.nombre
        user.email       = existing.email
        user.rol         = existing.rol
        user.iglesiaId   = existing.iglesiaId.toString()
        user.iglesiaSlug = iglesia.slug

        // Persist googleId on first OAuth login
        if (!existing.googleId) {
          await Usuario.updateOne({ _id: existing._id }, { googleId: account.providerAccountId })
        }
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.id          = user.id!
        token.nombre      = user.nombre
        token.rol         = user.rol
        token.iglesiaId   = user.iglesiaId
        token.iglesiaSlug = user.iglesiaSlug
      }
      return token
    },

    async session({ session, token }) {
      session.user.id          = token.id
      session.user.nombre      = token.nombre
      session.user.email       = token.email!
      session.user.rol         = token.rol
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
