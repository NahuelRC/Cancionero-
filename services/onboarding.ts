import 'server-only'
import { connectDB } from '@/lib/db'
import { createSecureToken, hashSecureToken } from '@/lib/secure-tokens'
import { ConflictError, NotFoundError } from '@/lib/errors'
import { OnboardingInvitation } from '@/models/OnboardingInvitation'
import { Resend } from 'resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const FROM    = process.env.RESEND_FROM ?? 'Klave <no-reply@klave.app>'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }

async function sendOnboardingEmail(email: string, onboardingUrl: string): Promise<void> {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Completa el alta de tu iglesia en Klave',
    html: `
      <p>Hola,</p>
      <p>Ya confirmamos tu pago. Completa el alta de tu iglesia en Klave desde este enlace:</p>
      <p><a href="${onboardingUrl}">Completar alta</a></p>
      <p>El link expira en 7 dias.</p>
    `,
  })
}

export interface CreateOnboardingInvitationInput {
  email: string
  planId: string
  paymentProvider: string
  paymentEventId: string
}

export interface OnboardingInvitationDTO {
  email: string
  planId: string
  expiresAt: string
}

export async function createOnboardingInvitationFromPayment(
  input: CreateOnboardingInvitationInput,
): Promise<{ created: boolean; onboardingUrl?: string }> {
  await connectDB()

  const existing = await OnboardingInvitation.findOne({
    paymentProvider: input.paymentProvider,
    paymentEventId: input.paymentEventId,
  })

  if (existing) {
    if (
      existing.status === 'PENDING' &&
      existing.expiresAt > new Date() &&
      !existing.emailSentAt
    ) {
      const token = createSecureToken()
      existing.tokenHash = hashSecureToken(token)
      existing.token = existing.tokenHash
      existing.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
      await existing.save()

      const onboardingUrl = `${APP_URL}/onboarding?token=${token}`
      await sendOnboardingEmail(input.email, onboardingUrl)

      existing.emailSentAt = new Date()
      await existing.save()

      return { created: false, onboardingUrl }
    }

    return { created: false }
  }

  const token     = createSecureToken()
  const tokenHash = hashSecureToken(token)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)

  try {
    await OnboardingInvitation.create({
      email: input.email.toLowerCase(),
      planId: input.planId,
      paymentProvider: input.paymentProvider,
      paymentEventId: input.paymentEventId,
      tokenHash,
      token: tokenHash,
      expiresAt,
      status: 'PENDING',
    })
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) return { created: false }
    throw err
  }

  const onboardingUrl = `${APP_URL}/onboarding?token=${token}`

  await sendOnboardingEmail(input.email, onboardingUrl)
  await OnboardingInvitation.updateOne(
    { paymentProvider: input.paymentProvider, paymentEventId: input.paymentEventId },
    { $set: { emailSentAt: new Date() } },
  )

  return { created: true, onboardingUrl }
}

export async function getPendingOnboardingInvitation(
  token: string,
): Promise<OnboardingInvitationDTO> {
  await connectDB()

  const tokenHash = hashSecureToken(token)
  const invitation = await OnboardingInvitation.findOne({
    tokenHash,
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  }).lean()

  if (!invitation) throw new NotFoundError('Onboarding')

  return {
    email: invitation.email,
    planId: invitation.planId,
    expiresAt: invitation.expiresAt.toISOString(),
  }
}

export async function assertOnboardingEmailAvailable(email: string): Promise<void> {
  await connectDB()

  const existing = await OnboardingInvitation.findOne({
    email: email.toLowerCase(),
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  }).lean()

  if (existing) throw new ConflictError('Ya existe un onboarding pendiente para este email')
}
