import { verifySession } from '@/lib/dal'
import { getCancion } from '@/services/canciones'
import { SongViewer } from '@/components/SongViewer'
import { CancionActions } from './CancionActions'
import Link from 'next/link'
import type { CancionDTO, CancionSinAcordesDTO } from '@/types'

export default async function CancionDetailPage({
  params,
}: PageProps<'/repertorio/[id]'>) {
  const { id } = await params
  const user   = await verifySession()
  const cancion = await getCancion(user, id)

  const isAdmin = user.rol === 'ADMIN'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 md:px-[22px] py-4 border-b border-[#3a3f47] flex items-center gap-3">
        <Link href="/repertorio" className="text-[#8b9099] hover:text-[#f4f1e8] text-sm">
          ← Repertorio
        </Link>
        {isAdmin && (
          <div className="ml-auto">
            <CancionActions id={id} titulo={cancion.titulo} />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <SongViewer
          cancion={cancion as CancionDTO | CancionSinAcordesDTO}
          sinAcordes={user.rol === 'MULTIMEDIA'}
        />
      </div>
    </div>
  )
}
