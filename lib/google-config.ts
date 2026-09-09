export function getGoogleConfig() {
  const clientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET
  return {
    clientId,
    clientSecret,
    enabled: Boolean(clientId && clientSecret),
  }
}
