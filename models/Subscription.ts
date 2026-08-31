import mongoose, { Document, Schema, Types } from 'mongoose'
import { SUBSCRIPTION_STATUS, type SubscriptionStatus } from '@/types'

export interface ISubscription extends Document {
  iglesiaId: Types.ObjectId
  provider: string
  providerCustomerId?: string
  providerSubscriptionId?: string
  planId: string
  status: SubscriptionStatus
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  cancelledAt?: Date
  createdAt: Date
  updatedAt: Date
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    iglesiaId:               { type: Schema.Types.ObjectId, ref: 'Iglesia', required: true },
    provider:                { type: String, required: true, trim: true },
    providerCustomerId:      { type: String, trim: true },
    providerSubscriptionId:  { type: String, trim: true },
    planId:                  { type: String, required: true, trim: true },
    status:                  { type: String, enum: SUBSCRIPTION_STATUS, default: 'PENDING' },
    currentPeriodStart:      Date,
    currentPeriodEnd:        Date,
    cancelledAt:             Date,
  },
  { timestamps: true },
)

SubscriptionSchema.index({ iglesiaId: 1, status: 1 })
SubscriptionSchema.index({ provider: 1, providerSubscriptionId: 1 }, { sparse: true })
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 })

export const Subscription =
  (mongoose.models.Subscription as mongoose.Model<ISubscription>) ??
  mongoose.model<ISubscription>('Subscription', SubscriptionSchema)
