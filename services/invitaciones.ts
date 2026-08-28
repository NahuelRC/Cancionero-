import 'server-only'
import { randomBytes } from 'crypto'
import { connectDB } from '@/lib/db'
import { Invitacion } from '@/models/Invitacion'
import { Usuario } from '@/models/Usuario'
import { Iglesia } from '@/models/Iglesia'
import { ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors'
import type { SessionUser, UserRole } from '@/types'
import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const FROM    = process.env.RESEND_FROM ?? 'Klave <no-reply@klave.app>'

export async function inviteUsuario(
  user: SessionUser,
  email: string,
  rol: UserRole,
): Promise<void> {
  if (user.rol !== 'admin') throw new ForbiddenError()

  await connectDB()

  // Prevent duplicate active users
  const exists = await Usuario.findOne({ iglesiaId: user.iglesiaId, email: email.toLowerCase() })
  if (exists) throw new ConflictError('El usuario ya existe en esta iglesia')

  // Revoke any pending invite for same email in this iglesia
  await Invitacion.deleteMany({ iglesiaId: user.iglesiaId, email: email.toLowerCase() })

  const token     = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48) // 48h

  await Invitacion.create({
    iglesiaId: user.iglesiaId,
    email:     email.toLowerCase(),
    rol,
    token,
    expiresAt,
  })

  const iglesia = await Iglesia.findById(user.iglesiaId).lean()
  const inviteUrl = `${APP_URL}/invitaciones/aceptar?token=${token}`

  await getResend().emails.send({
    from:    FROM,
    to:      email,
    subject: `Invitación a ${iglesia?.nombre ?? 'Klave'}`,
    html: `
      <p>Hola,</p>
      <p>${iglesia?.nombre ?? 'Una iglesia'} te invita a unirte a <strong>Klave</strong> como <strong>${rol}</strong>.</p>
      <p><a href="${inviteUrl}">Aceptar invitación</a></p>
      <p>El link expira en 48 horas.</p>
    `,
  })
}

export async function acceptInvitacion(
  token: string,
  nombre: string,
  password: string,
): Promise<{ iglesiaSlug: string }> {
  await connectDB()

  // Atomic claim: marks usedAt in one operation — concurrent requests get null
  const invitacion = await Invitacion.findOneAndUpdate(
    { token, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: false },
  )

  if (!invitacion) throw new NotFoundError('Invitación')

  const { hash } = await import('bcryptjs')
  const passwordHash = await hash(password, 12)

  try {
    await Usuario.create({
      iglesiaId:    invitacion.iglesiaId,
      email:        invitacion.email,
      nombre,
      rol:          invitacion.rol,
      passwordHash,
      activo:       true,
    })
  } catch (err: unknown) {
    // Unique index violation — user already exists (edge case)
    if ((err as { code?: number }).code === 11000) throw new ConflictError('Ya existe un usuario con ese email')
    throw err
  }

  const iglesia = await Iglesia.findById(invitacion.iglesiaId).lean()
  return { iglesiaSlug: iglesia?.slug ?? '' }
}
