import RegisterClient from './RegisterClient'
import { getGoogleConfig } from '@/lib/google-config'

export default function RegisterPage() {
  return <RegisterClient googleEnabled={getGoogleConfig().enabled} />
}
