import 'server-only'
import config from '@/config/super-admin.json'

export const SUPER_ADMIN_EMAIL = config.emails[0]

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && config.emails.includes(normalizeEmail(email)))
}
