import mongoose, { Document, Schema } from 'mongoose'
import {
  ORGANIZATION_STATUS,
  SUBSCRIPTION_STATUS,
  type OrganizationStatus,
  type SubscriptionStatus,
} from '@/types'

export interface IIglesia extends Document {
  nombre: string
  slug: string           // URL-safe unique identifier
  plan: 'free' | 'pro'
  estadoSuscripcion: 'activa' | 'prueba' | 'vencida'
  status?: OrganizationStatus
  subscriptionStatus?: SubscriptionStatus
  logoUrl?: string
  createdAt: Date
  updatedAt: Date
}

const IglesiaSchema = new Schema<IIglesia>(
  {
    nombre:            { type: String, required: true, trim: true },
    slug:              { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan:              { type: String, enum: ['free', 'pro'], default: 'free' },
    estadoSuscripcion: { type: String, enum: ['activa', 'prueba', 'vencida'], default: 'activa' },
    status:            { type: String, enum: ORGANIZATION_STATUS, default: 'ACTIVE' },
    subscriptionStatus: { type: String, enum: SUBSCRIPTION_STATUS, default: 'ACTIVE' },
    logoUrl:           String,
  },
  { timestamps: true },
)

export const Iglesia =
  (mongoose.models.Iglesia as mongoose.Model<IIglesia>) ??
  mongoose.model<IIglesia>('Iglesia', IglesiaSchema)
