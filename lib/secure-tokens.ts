import 'server-only'
import { createHash, randomBytes } from 'crypto'

export function createSecureToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashSecureToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
