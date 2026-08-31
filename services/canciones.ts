import 'server-only'
import { connectDB } from '@/lib/db'
import { Cancion, type ICancion } from '@/models/Cancion'
import { NotFoundError, ForbiddenError } from '@/lib/errors'
import { transposeSections } from '@/lib/chords/transpose'
import type {
  CancionDTO,
  CancionSinAcordesDTO,
  TenantSessionUser,
  PaginatedResponse,
  SongSection,
  Tonalidad,
} from '@/types'
import type { QueryFilter } from 'mongoose'

function toDTO(doc: ICancion): CancionDTO {
  return {
    id:        doc._id.toString(),
    titulo:    doc.titulo,
    artista:   doc.artista,
    tono:      doc.tono,
    bpm:       doc.bpm,
    compas:    doc.compas,
    secciones: doc.secciones as SongSection[],
    tags:      doc.tags,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

function stripChords(dto: CancionDTO): CancionSinAcordesDTO {
  return {
    ...dto,
    secciones: dto.secciones.map((s) => ({
      label: s.label,
      lines: s.lines.map((l) => ({ text: l.text })),
    })),
  }
}

const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
  reciente: { createdAt: -1 },
  titulo:   { titulo: 1 },
  artista:  { artista: 1, titulo: 1 },
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function listCanciones(
  user: TenantSessionUser,
  opts: { page?: number; pageSize?: number; q?: string; tags?: string[]; sort?: string } = {},
): Promise<PaginatedResponse<CancionDTO | CancionSinAcordesDTO>> {
  await connectDB()

  const page     = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(50, opts.pageSize ?? 20)
  const skip     = (page - 1) * pageSize
  const sortKey  = opts.sort && SORT_MAP[opts.sort] ? opts.sort : 'reciente'

  const filter: QueryFilter<ICancion> = { iglesiaId: user.iglesiaId }
  if (opts.q) {
    const safe = escapeRegex(opts.q)
    filter.$or = [
      { titulo:  { $regex: safe, $options: 'i' } },
      { artista: { $regex: safe, $options: 'i' } },
    ]
  }
  if (opts.tags?.length) filter.tags = { $all: opts.tags }

  const [docs, total] = await Promise.all([
    Cancion.find(filter).sort(SORT_MAP[sortKey]).skip(skip).limit(pageSize).lean(),
    Cancion.countDocuments(filter),
  ])

  const isMultimedia = user.rol === 'MULTIMEDIA'
  return {
    data:       docs.map((d) => { const dto = toDTO(d); return isMultimedia ? stripChords(dto) : dto }),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getCancion(
  user: TenantSessionUser,
  id: string,
  targetTone?: Tonalidad,
): Promise<CancionDTO | CancionSinAcordesDTO> {
  await connectDB()

  const doc = await Cancion.findOne({ _id: id, iglesiaId: user.iglesiaId }).lean()
  if (!doc) throw new NotFoundError('Canción')

  let dto = toDTO(doc)

  if (targetTone && targetTone !== dto.tono) {
    dto = { ...dto, secciones: transposeSections(dto.secciones, dto.tono, targetTone), tono: targetTone }
  }

  // Multimedia role never receives chord data
  if (user.rol === 'MULTIMEDIA') return stripChords(dto)

  return dto
}

export async function createCancion(
  user: TenantSessionUser,
  data: Omit<CancionDTO, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CancionDTO> {
  if (user.rol === 'MULTIMEDIA') throw new ForbiddenError()

  await connectDB()

  const doc = await Cancion.create({
    iglesiaId: user.iglesiaId,
    creadoPor: user.id,
    ...data,
  })

  return toDTO(doc)
}

export async function updateCancion(
  user: TenantSessionUser,
  id: string,
  data: Partial<Omit<CancionDTO, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<CancionDTO> {
  if (user.rol === 'MULTIMEDIA') throw new ForbiddenError()

  await connectDB()

  const doc = await Cancion.findOneAndUpdate(
    { _id: id, iglesiaId: user.iglesiaId },
    { $set: data },
    { new: true },
  ).lean()

  if (!doc) throw new NotFoundError('Canción')

  return toDTO(doc)
}

export async function deleteCancion(user: TenantSessionUser, id: string): Promise<void> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()

  await connectDB()

  const result = await Cancion.deleteOne({ _id: id, iglesiaId: user.iglesiaId })
  if (result.deletedCount === 0) throw new NotFoundError('Canción')
}
