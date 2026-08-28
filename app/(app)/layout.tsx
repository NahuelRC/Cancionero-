import { verifySession } from '@/lib/dal'
import { connectDB } from '@/lib/db'
import { Iglesia } from '@/models/Iglesia'
import { Sidebar, MobileBottomNav } from '@/components/Sidebar'
import { AuthProvider } from '@/components/AuthProvider'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user    = await verifySession()

  await connectDB()
  const iglesia = await Iglesia.findById(user.iglesiaId).lean()
  const iglesiaName = iglesia?.nombre ?? user.iglesiaSlug

  return (
    <AuthProvider>
      <div className="flex flex-col h-full bg-[#14171c]">
        <div className="flex flex-1 min-h-0">
          <Sidebar user={user} iglesiaName={iglesiaName} />
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
        </div>
        <MobileBottomNav user={user} />
      </div>
    </AuthProvider>
  )
}
