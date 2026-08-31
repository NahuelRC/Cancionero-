import 'server-only'

export const SUPER_ADMIN_EMAIL = 'nahuelrc90@gmail.com'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && normalizeEmail(email) === SUPER_ADMIN_EMAIL)
}
