import mongoose, { Document, Schema, Types } from 'mongoose'
import {
  INVITATION_STATUS,
  TENANT_USER_ROLES,
  type InvitationStatus,
  type StoredUserRole,
} from '@/types'

export interface IInvitacion extends Document {
  iglesiaId: Types.ObjectId
  email: string
  rol: StoredUserRole
  token: string              // secure random token sent in the invite link
  expiresAt: Date
  usedAt?: Date
  status?: InvitationStatus
  createdAt: Date
}

const InvitacionSchema = new Schema<IInvitacion>(
  {
    iglesiaId: { type: Schema.Types.ObjectId, ref: 'Iglesia', required: true },
    email:     { type: String, required: true, lowercase: true, trim: true },
    rol:       { type: String, enum: [...TENANT_USER_ROLES, 'admin', 'musico', 'multimedia'], required: true },
    token:     { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt:    Date,
    status:    { type: String, enum: INVITATION_STATUS, default: 'PENDING' },
  },
  { timestamps: true },
)

InvitacionSchema.index({ iglesiaId: 1, email: 1 })
InvitacionSchema.index({ status: 1, expiresAt: 1 })
// TTL: MongoDB auto-removes expired+unused invitations after 7 days of expiry
InvitacionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 })

export const Invitacion =
  (mongoose.models.Invitacion as mongoose.Model<IInvitacion>) ??
  mongoose.model<IInvitacion>('Invitacion', InvitacionSchema)
