import { auth } from './lib/auth'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/onboarding',
  '/invitaciones/aceptar',
  '/api/auth',
  '/api/register',
  '/api/health',
  '/api/invitaciones/aceptar',
  '/api/onboarding',
  '/api/payments/webhook',
  '/api/payments/mercadopago/webhook',
]

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  // Read the session without the auth wrapper's rolling Set-Cookie header.
  // A pending API/stream response must not restore a cookie after logout.
  const session = await auth()
  if (!session) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!login|register|onboarding|api/auth|api/register|api/health|api/invitaciones/aceptar|api/onboarding|api/payments/webhook|api/payments/mercadopago/webhook|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
