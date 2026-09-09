import RegisterClient from './RegisterClient'

export default function RegisterPage() {
  return <RegisterClient googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} />
}
