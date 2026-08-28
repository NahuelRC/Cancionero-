import { verifySession } from '@/lib/dal'
import { getEnVivoState } from '@/services/envivo'
import { EnVivoPage } from '@/components/EnVivoPage'

export default async function EnVivoServerPage() {
  const user         = await verifySession()
  const initialState = await getEnVivoState(user)

  return <EnVivoPage initialState={initialState} user={user} />
}
