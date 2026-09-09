import mongoose, { Schema, Types } from 'mongoose'

interface ISubscriptionPayment {
  subscriptionId: Types.ObjectId
  paymentId: string
  invoiceId: string
  paidThrough: Date
  approved: boolean
}
const schema = new Schema<ISubscriptionPayment>({
  subscriptionId: { type: Schema.Types.ObjectId, ref: 'MonthlySubscription', required: true, index: true },
  paymentId: { type: String, required: true, unique: true },
  invoiceId: { type: String, required: true },
  paidThrough: { type: Date, required: true },
  approved: { type: Boolean, required: true },
}, { timestamps: true })
export const SubscriptionPayment = (mongoose.models.SubscriptionPayment as mongoose.Model<ISubscriptionPayment>)
  ?? mongoose.model<ISubscriptionPayment>('SubscriptionPayment', schema)
