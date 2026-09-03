import 'server-only'

export function isInternalDemoMode(): boolean {
  if (process.env.KLAVE_DEMO_MODE === 'true') return true
  if (process.env.KLAVE_DEMO_MODE === 'false') return false

  return process.env.NODE_ENV !== 'production'
}

export function isDirectRegisterEnabled(): boolean {
  return isInternalDemoMode() || process.env.ALLOW_DIRECT_REGISTER === 'true'
}
