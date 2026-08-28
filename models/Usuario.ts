import mongoose, { Document, Schema, Types } from 'mongoose'
import type { UserRole } from '@/types'

export interface IUsuario extends Document {
  iglesiaId: Types.ObjectId
  nombre: string
  email: string
  passwordHash?: string       // absent when using OAuth only
  rol: UserRole
  activo: boolean
  googleId?: string
  createdAt: Date
  updatedAt: Date
}

const UsuarioSchema = new Schema<IUsuario>(
  {
    iglesiaId:    { type: Schema.Types.ObjectId, ref: 'Iglesia', required: true },
    nombre:       { type: String, required: true, trim: true },
    email:        { type: String, required: true, lowercase: true, trim: true },
    passwordHash: String,
    rol:          { type: String, enum: ['admin', 'musico', 'multimedia'], required: true },
    activo:       { type: Boolean, default: true },
    googleId:     String,
  },
  { timestamps: true },
)

// Tenant-scoped uniqueness: one email per iglesia
UsuarioSchema.index({ iglesiaId: 1, email: 1 }, { unique: true })
UsuarioSchema.index({ iglesiaId: 1, rol: 1 })

export const Usuario =
  (mongoose.models.Usuario as mongoose.Model<IUsuario>) ??
  mongoose.model<IUsuario>('Usuario', UsuarioSchema)
