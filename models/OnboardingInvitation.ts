import mongoose, { Document, Schema, Types } from 'mongoose'

export type OnboardingInvitationStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'REVOKED'

export interface IOnboardingInvitation extends Document {
  email: string
  tokenHash: string
  token?: string
  planId: string
  paymentProvider: string
  paymentEventId: string
  expiresAt: Date
  emailSentAt?: Date
  completedAt?: Date
  status: OnboardingInvitationStatus
  iglesiaId?: Types.ObjectId
  userId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const OnboardingInvitationSchema = new Schema<IOnboardingInvitation>(
  {
    email:           { type: String, required: true, lowercase: true, trim: true },
    tokenHash:       { type: String, required: true, unique: true, sparse: true },
    token:           { type: String, select: false },
    planId:          { type: String, required: true, trim: true },
    paymentProvider: { type: String, required: true, trim: true },
    paymentEventId:  { type: String, required: true, trim: true },
    expiresAt:       { type: Date, required: true },
    emailSentAt:     Date,
    completedAt:     Date,
    status:          { type: String, enum: ['PENDING', 'COMPLETED', 'EXPIRED', 'REVOKED'], default: 'PENDING' },
    iglesiaId:       { type: Schema.Types.ObjectId, ref: 'Iglesia' },
    userId:          { type: Schema.Types.ObjectId, ref: 'Usuario' },
  },
  { timestamps: true },
)

OnboardingInvitationSchema.index({ paymentProvider: 1, paymentEventId: 1 }, { unique: true })
OnboardingInvitationSchema.index({ status: 1, expiresAt: 1 })
OnboardingInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })

export const OnboardingInvitation =
  (mongoose.models.OnboardingInvitation as mongoose.Model<IOnboardingInvitation>) ??
  mongoose.model<IOnboardingInvitation>('OnboardingInvitation', OnboardingInvitationSchema)
