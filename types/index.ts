import type { Types } from 'mongoose'

// ─── Roles ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'musico' | 'multimedia'

// ─── Session ──────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  nombre: string
  email: string
  rol: UserRole
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
