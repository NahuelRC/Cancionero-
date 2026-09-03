import { verifySession } from '@/lib/dal'
import { getCancion } from '@/services/canciones'
import { EditarCancionClient } from './EditarCancionClient'
import { redirect } from 'next/navigation'
import type { CancionDTO } from '@/types'

export default async function EditarCancionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user   = await verifySession()

  if (user.rol !== 'ADMIN') redirect(`/repertorio/${id}`)

  const cancion = await getCancion(user, id) as CancionDTO

  return <EditarCancionClient cancion={cancion} />
}
