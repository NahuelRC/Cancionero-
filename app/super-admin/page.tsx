import { requireSuperAdmin } from '@/lib/dal'
import { listIglesiasWithAdmins } from '@/services/super-admin'
import SuperAdminClient from './SuperAdminClient'

export default async function SuperAdminPage() {
  const user = await requireSuperAdmin()
  const iglesias = await listIglesiasWithAdmins()

  return (
    <SuperAdminClient
      initialIglesias={iglesias}
      userName={user.nombre}
      userEmail={user.email}
    />
  )
}
