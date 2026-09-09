import mongoose, { Schema, Types } from 'mongoose'

export interface IMonthlySubscription {
  userId: Types.ObjectId
  iglesiaId?: Types.ObjectId
  iglesiaName: string
  slug: string
  email: string
  amount: number
  currency: string
  providerId?: string
  checkoutUrl?: string
  status: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'
  paidThrough?: Date
  providerUpdatedAt?: Date
  providerStatus?: string
  checkoutLeaseUntil?: Date
}

const schema = new Schema<IMonthlySubscription>({
  userId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
  iglesiaId: { type: Schema.Types.ObjectId, ref: 'Iglesia' },
  iglesiaName: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, required: true, enum: ['ARS'] },
  providerId: { type: String, unique: true, sparse: true },
  checkoutUrl: String,
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED'], default: 'PENDING' },
  paidThrough: Date,
  providerUpdatedAt: Date,
  providerStatus: String,
  checkoutLeaseUntil: Date,
}, { timestamps: true })

export const MonthlySubscription = (mongoose.models.MonthlySubscription as mongoose.Model<IMonthlySubscription>)
  ?? mongoose.model<IMonthlySubscription>('MonthlySubscription', schema)
