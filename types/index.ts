import type { Types } from 'mongoose'

// Roles

export const USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MUSICIAN', 'MULTIMEDIA'] as const
export const TENANT_USER_ROLES = ['ADMIN', 'MUSICIAN', 'MULTIMEDIA'] as const
export const LEGACY_USER_ROLES = ['admin', 'musico', 'multimedia'] as const

export type UserRole = (typeof USER_ROLES)[number]
export type TenantUserRole = (typeof TENANT_USER_ROLES)[number]
export type LegacyUserRole = (typeof LEGACY_USER_ROLES)[number]
export type StoredUserRole = UserRole | LegacyUserRole

export const USER_STATUS = ['INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED'] as const
export const ONBOARDING_STATUS = ['PENDING', 'COMPLETED'] as const
export const ORGANIZATION_STATUS = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED'] as const
export const SUBSCRIPTION_STATUS = ['PENDING', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED'] as const
export const INVITATION_STATUS = ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'] as const

export type UserStatus = (typeof USER_STATUS)[number]
export type OnboardingStatus = (typeof ONBOARDING_STATUS)[number]
export type OrganizationStatus = (typeof ORGANIZATION_STATUS)[number]
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number]
export type InvitationStatus = (typeof INVITATION_STATUS)[number]

export function normalizeRole(role: StoredUserRole | string | null | undefined): UserRole | null {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
    case 'MUSICIAN':
    case 'MULTIMEDIA':
      return role
    case 'admin':
      return 'ADMIN'
    case 'musico':
      return 'MUSICIAN'
    case 'multimedia':
      return 'MULTIMEDIA'
    default:
      return null
  }
}

export function isTenantRole(role: UserRole | null | undefined): role is TenantUserRole {
  return role === 'ADMIN' || role === 'MUSICIAN' || role === 'MULTIMEDIA'
}

// Session

export interface SessionUser {
  id: string
  nombre: string
  email: string
  rol: UserRole
  iglesiaId?: string | null
  iglesiaSlug?: string | null
  status?: UserStatus
  onboardingStatus?: OnboardingStatus
}

export interface TenantSessionUser extends SessionUser {
  rol: TenantUserRole
  iglesiaId: string
  iglesiaSlug: string
}

// ─── Cancion ──────────────────────────────────────────────────────────────────

export type ChordAnnotation = {
  chord: string
  position: number // char offset within the line
}

export type SongLine = {
  text: string
  chords: ChordAnnotation[]
}

export type SongSection = {
  label: string // e.g. "Verso 1", "Coro", "Puente"
  lines: SongLine[]
}

export type Tonalidad =
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F'
  | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B'

// ─── Cancion DTO (safe to send to client) ─────────────────────────────────────

export interface CancionDTO {
  id: string
  titulo: string
  artista?: string
  tono: Tonalidad
  bpm?: number
  compas?: string
  secciones: SongSection[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

/** Same as CancionDTO but chords stripped — sent to Multimedia role */
export interface CancionSinAcordesDTO extends Omit<CancionDTO, 'secciones'> {
  secciones: Array<{
    label: string
    lines: Array<{ text: string }>
  }>
}

// ─── En Vivo ──────────────────────────────────────────────────────────────────

export interface EnVivoSetItem {
  cancionId: string
  tono: Tonalidad
  titulo: string
  artista?: string
}

export interface EnVivoState {
  id?: string
  activo: boolean
  nombre: string
  fecha: string
  canciones: EnVivoSetItem[]
  cancionActivaIdx: number  // -1 = ninguna seleccionada
  updatedAt: string
}

// ─── Mongoose ObjectId alias ──────────────────────────────────────────────────

export type MongoId = Types.ObjectId

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  ok: true
  data: T
}

export interface ApiError {
  ok: false
  message: string
  issues?: unknown
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError
