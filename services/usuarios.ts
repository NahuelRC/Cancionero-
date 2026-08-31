import 'server-only'
import { connectDB } from '@/lib/db'
import { Usuario } from '@/models/Usuario'
import { ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors'
import {
  normalizeRole,
  type TenantSessionUser,
  type TenantUserRole,
} from '@/types'

export interface UsuarioDTO {
  id: string
  nombre: string
  email: string
  rol: TenantUserRole
  activo: boolean
  createdAt: string
}

function toDTO(doc: InstanceType<typeof Usuario>): UsuarioDTO {
  return {
    id:        doc._id.toString(),
    nombre:    doc.nombre,
    email:     doc.email,
    rol:       normalizeRole(doc.rol) as TenantUserRole,
    activo:    doc.activo,
    createdAt: doc.createdAt.toISOString(),
  }
}

export async function listUsuarios(user: TenantSessionUser): Promise<UsuarioDTO[]> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()

  await connectDB()
  const docs = await Usuario.find({ iglesiaId: user.iglesiaId }).sort({ nombre: 1 })
  return docs.map(toDTO)
}

export async function updateUsuarioRol(
  user: TenantSessionUser,
  targetId: string,
  newRol: TenantUserRole,
): Promise<UsuarioDTO> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()
  if (user.id === targetId) throw new ForbiddenError('No puedes cambiar tu propio rol')

  await connectDB()

  const doc = await Usuario.findOneAndUpdate(
    { _id: targetId, iglesiaId: user.iglesiaId },
    { $set: { rol: newRol } },
    { new: true },
  )

  if (!doc) throw new NotFoundError('Usuario')
  return toDTO(doc)
}

export async function deactivateUsuario(user: TenantSessionUser, targetId: string): Promise<void> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()
  if (user.id === targetId) throw new ForbiddenError('No puedes desactivarte a ti mismo')

  await connectDB()

  const result = await Usuario.updateOne(
    { _id: targetId, iglesiaId: user.iglesiaId },
    { $set: { activo: false } },
  )

  if (result.matchedCount === 0) throw new NotFoundError('Usuario')
}

export async function getOrCreateFromOAuth(opts: {
  email: string
  nombre: string
  googleId: string
  iglesiaId: string
}): Promise<UsuarioDTO> {
  await connectDB()

  const existing = await Usuario.findOne({
    iglesiaId: opts.iglesiaId,
    email: opts.email,
  })

  if (existing) {
    if (!existing.googleId) {
      existing.googleId = opts.googleId
      await existing.save()
    }
    return toDTO(existing)
  }

  throw new ConflictError('El email no está registrado en esta iglesia')
}
