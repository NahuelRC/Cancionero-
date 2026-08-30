import mongoose, { Document, Schema, Types } from 'mongoose'
import {
  ONBOARDING_STATUS,
  USER_ROLES,
  USER_STATUS,
  type OnboardingStatus,
  type StoredUserRole,
  type UserStatus,
} from '@/types'

export interface IUsuario extends Document {
  iglesiaId?: Types.ObjectId | null
  nombre: string
  email: string
  passwordHash?: string       // absent when using OAuth only
  rol: StoredUserRole
  activo: boolean
  status?: UserStatus
  onboardingStatus?: OnboardingStatus
  googleId?: string
  createdAt: Date
  updatedAt: Date
}

const UsuarioSchema = new Schema<IUsuario>(
  {
    iglesiaId: {
      type: Schema.Types.ObjectId,
      ref: 'Iglesia',
      required(this: IUsuario) {
        return this.rol !== 'SUPER_ADMIN'
      },
      default: null,
    },
    nombre:       { type: String, required: true, trim: true },
    email:        { type: String, required: true, lowercase: true, trim: true },
    passwordHash: String,
    rol:          { type: String, enum: [...USER_ROLES, 'admin', 'musico', 'multimedia'], required: true },
    activo:       { type: Boolean, default: true },
    status:       { type: String, enum: USER_STATUS, default: 'ACTIVE' },
    onboardingStatus: { type: String, enum: ONBOARDING_STATUS, default: 'COMPLETED' },
    googleId:     String,
  },
  { timestamps: true },
)

UsuarioSchema.index({ iglesiaId: 1, email: 1 }, { unique: true })
UsuarioSchema.index({ iglesiaId: 1, rol: 1 })
UsuarioSchema.index({ email: 1 })
UsuarioSchema.index({ status: 1 })

export const Usuario =
  (mongoose.models.Usuario as mongoose.Model<IUsuario>) ??
  mongoose.model<IUsuario>('Usuario', UsuarioSchema)
