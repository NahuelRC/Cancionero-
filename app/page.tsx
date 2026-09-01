import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { normalizeRole, type SessionUser } from '@/types'

export default async function RootPage() {
  const session = await auth()
  if (session?.user) {
    const role = normalizeRole((session.user as SessionUser).rol)
    if (role === 'SUPER_ADMIN') redirect('/super-admin')
    redirect('/en-vivo')
  } else {
    redirect('/login')
  }
}
