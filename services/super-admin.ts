import 'server-only'
import { Types } from 'mongoose'
import { Resend } from 'resend'
import { connectDB } from '@/lib/db'
import { createSecureToken, hashSecureToken } from '@/lib/secure-tokens'
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { normalizeEmail } from '@/lib/super-admin'
import { Iglesia } from '@/models/Iglesia'
import { Invitacion } from '@/models/Invitacion'
import { Usuario } from '@/models/Usuario'
import type { SessionUser, UserStatus } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const FROM = process.env.RESEND_FROM ?? 'Klave <no-reply@klave.app>'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }

interface LeanIglesia {
  _id: Types.ObjectId
  nombre: string
  slug: string
  plan: 'free' | 'pro'
  status?: string
  subscriptionStatus?: string
  estadoSuscripcion?: string
  createdAt: Date
}

interface LeanUsuario {
  _id: Types.ObjectId
  iglesiaId?: Types.ObjectId
  nombre: string
  email: string
  activo: boolean
  status?: UserStatus
  createdAt: Date
}

interface LeanInvitacion {
  _id: Types.ObjectId
  iglesiaId: Types.ObjectId
  email: string
  expiresAt: Date
  createdAt: Date
}

export interface SuperAdminAdminDTO {
  id: string
  nombre: string
  email: string
  activo: boolean
  status: UserStatus
  createdAt: string
}

export interface SuperAdminInviteDTO {
  id: string
  email: string
  expiresAt: string
  createdAt: string
}

export interface SuperAdminIglesiaDTO {
  id: string
  nombre: string
  slug: string
  plan: 'free' | 'pro'
  status: string
  subscriptionStatus: string
  estadoSuscripcion: string
  createdAt: string
  admins: SuperAdminAdminDTO[]
  pendingAdminInvites: SuperAdminInviteDTO[]
}

export async function listIglesiasWithAdmins(): Promise<SuperAdminIglesiaDTO[]> {
  await connectDB()

  const iglesias = await Iglesia.find({})
    .sort({ nombre: 1 })
    .lean<LeanIglesia[]>()

  const iglesiaIds = iglesias.map((iglesia) => iglesia._id)
  const [admins, pendingInvites] = await Promise.all([
    Usuario.find({
      iglesiaId: { $in: iglesiaIds },
      rol: { $in: ['ADMIN', 'admin'] },
    }).sort({ nombre: 1 }).lean<LeanUsuario[]>(),
    Invitacion.find({
      iglesiaId: { $in: iglesiaIds },
      rol: { $in: ['ADMIN', 'admin'] },
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).lean<LeanInvitacion[]>(),
  ])

  const adminsByIglesia = new Map<string, SuperAdminAdminDTO[]>()
  for (const admin of admins) {
    if (!admin.iglesiaId) continue
    const key = admin.iglesiaId.toString()
    const values = adminsByIglesia.get(key) ?? []
    values.push({
      id: admin._id.toString(),
      nombre: admin.nombre,
      email: admin.email,
      activo: admin.activo,
      status: admin.status ?? 'ACTIVE',
      createdAt: admin.createdAt.toISOString(),
    })
    adminsByIglesia.set(key, values)
  }

  const invitesByIglesia = new Map<string, SuperAdminInviteDTO[]>()
  for (const invite of pendingInvites) {
    const key = invite.iglesiaId.toString()
    const values = invitesByIglesia.get(key) ?? []
    values.push({
      id: invite._id.toString(),
      email: invite.email,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    })
    invitesByIglesia.set(key, values)
  }

  return iglesias.map((iglesia) => {
    const id = iglesia._id.toString()
    return {
      id,
      nombre: iglesia.nombre,
      slug: iglesia.slug,
      plan: iglesia.plan,
      status: iglesia.status ?? 'ACTIVE',
      subscriptionStatus: iglesia.subscriptionStatus ?? 'ACTIVE',
      estadoSuscripcion: iglesia.estadoSuscripcion ?? 'activa',
      createdAt: iglesia.createdAt.toISOString(),
      admins: adminsByIglesia.get(id) ?? [],
      pendingAdminInvites: invitesByIglesia.get(id) ?? [],
    }
  })
}

export async function inviteChurchAdmin(
  superAdmin: SessionUser,
  iglesiaId: string,
  email: string,
): Promise<void> {
  if (superAdmin.rol !== 'SUPER_ADMIN') throw new ForbiddenError()
  if (!Types.ObjectId.isValid(iglesiaId)) throw new NotFoundError('Iglesia')

  await connectDB()

  const normalizedEmail = normalizeEmail(email)
  const iglesia = await Iglesia.findById(iglesiaId).lean<LeanIglesia>()
  if (!iglesia) throw new NotFoundError('Iglesia')

  const existing = await Usuario.findOne({ iglesiaId, email: normalizedEmail }).lean()
  if (existing) throw new ConflictError('El usuario ya existe en esta iglesia')

  await Invitacion.deleteMany({
    iglesiaId,
    email: normalizedEmail,
    rol: { $in: ['ADMIN', 'admin'] },
    status: 'PENDING',
  })

  const token = createSecureToken()
  const tokenHash = hashSecureToken(token)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48)

  await Invitacion.create({
    iglesiaId,
    email: normalizedEmail,
    rol: 'ADMIN',
    token: tokenHash,
    tokenHash,
    expiresAt,
    status: 'PENDING',
  })

  const inviteUrl = `${APP_URL}/invitaciones/aceptar?token=${token}`
  await getResend().emails.send({
    from: FROM,
    to: normalizedEmail,
    subject: `Invitación a ${iglesia.nombre}`,
    html: `
      <p>Hola,</p>
      <p>Klave te invita a administrar <strong>${iglesia.nombre}</strong>.</p>
      <p><a href="${inviteUrl}">Aceptar invitación</a></p>
      <p>El link expira en 48 horas.</p>
    `,
  })
}

export async function revokeChurchAdmin(
  superAdmin: SessionUser,
  adminId: string,
): Promise<void> {
  if (superAdmin.rol !== 'SUPER_ADMIN') throw new ForbiddenError()
  if (!Types.ObjectId.isValid(adminId)) throw new NotFoundError('Usuario')

  await connectDB()

  const result = await Usuario.updateOne(
    { _id: adminId, rol: { $in: ['ADMIN', 'admin'] } },
    { $set: { activo: false, status: 'DISABLED' } },
  )

  if (result.matchedCount === 0) throw new NotFoundError('Usuario')
}
