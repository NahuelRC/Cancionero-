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

  const target = await Usuario.findOne({ _id: targetId, iglesiaId: user.iglesiaId })
  if (!target) throw new NotFoundError('Usuario')

  const currentRol = normalizeRole(target.rol)
  if (currentRol === 'ADMIN' && newRol !== 'ADMIN' && target.activo) {
    const activeAdmins = await Usuario.countDocuments({ iglesiaId: user.iglesiaId, rol: { $in: ['ADMIN', 'admin'] }, activo: true })
    if (activeAdmins <= 1) throw new ForbiddenError('La iglesia necesita al menos un ADMIN activo')
  }

  target.rol = newRol
  await target.save()
  return toDTO(target)
}

export async function updateUsuarioPerfil(
  user: TenantSessionUser,
  targetId: string,
  data: { nombre?: string; email?: string },
): Promise<UsuarioDTO> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()

  await connectDB()

  const target = await Usuario.findOne({ _id: targetId, iglesiaId: user.iglesiaId })
  if (!target) throw new NotFoundError('Usuario')

  if (data.email && data.email.toLowerCase() !== target.email) {
    const exists = await Usuario.findOne({ iglesiaId: user.iglesiaId, email: data.email.toLowerCase(), _id: { $ne: targetId } })
    if (exists) throw new ConflictError('Ya existe un usuario con ese email')
    target.email = data.email.toLowerCase()
  }

  if (data.nombre) target.nombre = data.nombre
  await target.save()
  return toDTO(target)
}

export async function deactivateUsuario(user: TenantSessionUser, targetId: string): Promise<void> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()
  if (user.id === targetId) throw new ForbiddenError('No puedes desactivarte a ti mismo')

  await connectDB()

  const target = await Usuario.findOne({ _id: targetId, iglesiaId: user.iglesiaId })
  if (!target) throw new NotFoundError('Usuario')

  if (normalizeRole(target.rol) === 'ADMIN' && target.activo) {
    const activeAdmins = await Usuario.countDocuments({ iglesiaId: user.iglesiaId, rol: { $in: ['ADMIN', 'admin'] }, activo: true })
    if (activeAdmins <= 1) throw new ForbiddenError('La iglesia necesita al menos un ADMIN activo')
  }

  target.activo = false
  target.status = 'DISABLED'
  await target.save()
}

export async function reactivateUsuario(user: TenantSessionUser, targetId: string): Promise<UsuarioDTO> {
  if (user.rol !== 'ADMIN') throw new ForbiddenError()

  await connectDB()

  const target = await Usuario.findOne({ _id: targetId, iglesiaId: user.iglesiaId })
  if (!target) throw new NotFoundError('Usuario')

  target.activo = true
  target.status = 'ACTIVE'
  await target.save()
  return toDTO(target)
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
