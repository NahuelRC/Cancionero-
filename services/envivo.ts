import 'server-only'
import { connectDB } from '@/lib/db'
import { EnVivo } from '@/models/EnVivo'
import { Cancion } from '@/models/Cancion'
import { ForbiddenError, NotFoundError } from '@/lib/errors'
import type { EnVivoState, EnVivoSetItem, TenantSessionUser, Tonalidad, PaginatedResponse } from '@/types'
import type { Types } from 'mongoose'

async function populateSetItems(
  canciones: Array<{ cancionId: Types.ObjectId; tono: string }>,
): Promise<EnVivoSetItem[]> {
  if (canciones.length === 0) return []

  const ids  = canciones.map((c) => c.cancionId)
  const docs = await Cancion.find({ _id: { $in: ids } }).select('titulo artista').lean()
  const map  = new Map(docs.map((d) => [d._id.toString(), d]))

  return canciones.map((c) => {
    const song = map.get(c.cancionId.toString())
    return {
      cancionId: c.cancionId.toString(),
      tono:      c.tono as Tonalidad,
      titulo:    song?.titulo ?? '(sin título)',
      artista:   song?.artista,
    }
  })
}

function emptyState(): EnVivoState {
  return {
    activo:          false,
    nombre:          '',
    fecha:           new Date().toISOString().slice(0, 10),
    canciones:       [],
    cancionActivaIdx: -1,
    updatedAt:       new Date().toISOString(),
  }
}

async function toState(doc: InstanceType<typeof EnVivo> | null): Promise<EnVivoState> {
  if (!doc) return emptyState()

  const canciones = await populateSetItems(doc.canciones)

  return {
    id:              doc._id.toString(),
    activo:          doc.activo,
    nombre:          doc.nombre,
    fecha:           doc.fecha.toISOString().slice(0, 10),
    canciones,
    cancionActivaIdx: doc.cancionActivaIdx,
    updatedAt:       doc.updatedAt.toISOString(),
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getEnVivoState(user: TenantSessionUser): Promise<EnVivoState> {
  await connectDB()
  const doc = await EnVivo.findOne({ iglesiaId: user.iglesiaId, activo: true }).lean()
  return toState(doc as InstanceType<typeof EnVivo> | null)
}

export async function getEnVivoHistorial(
  user: TenantSessionUser,
  opts: { page?: number; pageSize?: number } = {},
): Promise<PaginatedResponse<EnVivoState>> {
  await connectDB()

  const page     = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(50, opts.pageSize ?? 10)
  const skip     = (page - 1) * pageSize

  const [docs, total] = await Promise.all([
    EnVivo.find({ iglesiaId: user.iglesiaId, activo: false })
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    EnVivo.countDocuments({ iglesiaId: user.iglesiaId, activo: false }),
  ])

  const data = await Promise.all(
    docs.map((d) => toState(d as InstanceType<typeof EnVivo>)),
  )

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createEnVivo(
  user: TenantSessionUser,
  data: { nombre?: string; fecha?: string },
): Promise<EnVivoState> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()

  await connectDB()

  // Deactivate any existing active session
  await EnVivo.updateMany({ iglesiaId: user.iglesiaId, activo: true }, { $set: { activo: false } })

  const doc = await EnVivo.create({
    iglesiaId:       user.iglesiaId,
    nombre:          data.nombre ?? 'Sesión',
    fecha:           data.fecha ? new Date(data.fecha) : new Date(),
    activo:          true,
    canciones:       [],
    cancionActivaIdx: -1,
  })

  return toState(doc)
}

export async function addCancionToSet(
  user: TenantSessionUser,
  cancionId: string,
): Promise<EnVivoState> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()

  await connectDB()

  const song = await Cancion.findOne({ _id: cancionId, iglesiaId: user.iglesiaId }).lean()
  if (!song) throw new NotFoundError('Canción')

  const doc = await EnVivo.findOneAndUpdate(
    { iglesiaId: user.iglesiaId, activo: true },
    { $push: { canciones: { cancionId, tono: song.tono } } },
    { new: true },
  )

  if (!doc) throw new NotFoundError('Sesión activa')
  return toState(doc)
}

export async function removeCancionFromSet(
  user: TenantSessionUser,
  idx: number,
): Promise<EnVivoState> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()

  await connectDB()

  const doc = await EnVivo.findOne({ iglesiaId: user.iglesiaId, activo: true })
  if (!doc) throw new NotFoundError('Sesión activa')

  if (idx < 0 || idx >= doc.canciones.length) throw new NotFoundError('Canción en el set')

  doc.canciones.splice(idx, 1)

  // Adjust active index if needed
  if (doc.cancionActivaIdx >= doc.canciones.length) {
    doc.cancionActivaIdx = doc.canciones.length - 1
  }
  if (doc.canciones.length === 0) doc.cancionActivaIdx = -1

  await doc.save()
  return toState(doc)
}

export async function moveCancionInSet(
  user: TenantSessionUser,
  fromIdx: number,
  toIdx: number,
): Promise<EnVivoState> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()

  await connectDB()

  const doc = await EnVivo.findOne({ iglesiaId: user.iglesiaId, activo: true })
  if (!doc) throw new NotFoundError('Sesión activa')

  const len = doc.canciones.length
  if (fromIdx < 0 || fromIdx >= len || toIdx < 0 || toIdx >= len) {
    throw new NotFoundError('Índice fuera de rango')
  }

  const [item] = doc.canciones.splice(fromIdx, 1)
  doc.canciones.splice(toIdx, 0, item)

  // Keep active index tracking the same song
  if (doc.cancionActivaIdx === fromIdx) {
    doc.cancionActivaIdx = toIdx
  } else if (fromIdx < toIdx) {
    if (doc.cancionActivaIdx > fromIdx && doc.cancionActivaIdx <= toIdx) {
      doc.cancionActivaIdx -= 1
    }
  } else {
    if (doc.cancionActivaIdx >= toIdx && doc.cancionActivaIdx < fromIdx) {
      doc.cancionActivaIdx += 1
    }
  }

  await doc.save()
  return toState(doc)
}

export async function setActiveCancion(
  user: TenantSessionUser,
  idx: number,
): Promise<EnVivoState> {
  if (user.rol === 'MULTIMEDIA') throw new ForbiddenError()

  await connectDB()

  const doc = await EnVivo.findOneAndUpdate(
    { iglesiaId: user.iglesiaId, activo: true },
    { $set: { cancionActivaIdx: idx } },
    { new: true },
  )

  if (!doc) throw new NotFoundError('Sesión activa')
  return toState(doc)
}

export async function updateCancionTono(
  user: TenantSessionUser,
  idx: number,
  tono: Tonalidad,
): Promise<EnVivoState> {
  if (user.rol === 'MULTIMEDIA') throw new ForbiddenError()

  await connectDB()

  const doc = await EnVivo.findOne({ iglesiaId: user.iglesiaId, activo: true })
  if (!doc) throw new NotFoundError('Sesión activa')
  if (idx < 0 || idx >= doc.canciones.length) throw new NotFoundError('Canción en el set')

  doc.canciones[idx].tono = tono
  await doc.save()
  return toState(doc)
}

export async function stopEnVivo(user: TenantSessionUser): Promise<EnVivoState> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()

  await connectDB()

  const doc = await EnVivo.findOneAndUpdate(
    { iglesiaId: user.iglesiaId, activo: true },
    { $set: { activo: false } },
    { new: true },
  )

  return toState(doc)
}
