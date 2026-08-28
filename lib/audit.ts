import 'server-only'
import mongoose, { Document, Schema, Types } from 'mongoose'
import { connectDB } from './db'
import type { SessionUser } from '@/types'

type AuditAction =
  | 'cancion.delete'
  | 'cancion.create'
  | 'cancion.update'
  | 'usuario.rol_change'
  | 'usuario.deactivate'
  | 'envivo.create'
  | 'envivo.stop'
  | 'invitacion.send'

interface IAuditLog extends Document {
  iglesiaId:  Types.ObjectId
  userId:     Types.ObjectId
  userNombre?: string
  action:     string
  targetId?:  string
  targetType?: string
  meta?:      Record<string, unknown>
  createdAt:  Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    iglesiaId:  { type: Schema.Types.ObjectId, required: true },
    userId:     { type: Schema.Types.ObjectId, required: true },
    userNombre: String,
    action:     { type: String, required: true },
    targetId:   String,
    targetType: String,
    meta:       Schema.Types.Mixed,
  },
  { timestamps: true },
)

AuditLogSchema.index({ iglesiaId: 1, createdAt: -1 })

const AuditLog =
  (mongoose.models.AuditLog as mongoose.Model<IAuditLog>) ??
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)

export async function logAction(
  user: SessionUser,
  action: AuditAction,
  target?: { id?: string; type?: string; meta?: Record<string, unknown> },
): Promise<void> {
  try {
    await connectDB()
    await AuditLog.create({
      iglesiaId:  user.iglesiaId,
      userId:     user.id,
      userNombre: user.nombre,
      action,
      targetId:   target?.id,
      targetType: target?.type,
      meta:       target?.meta,
    })
  } catch {
    // Audit logging is best-effort — never block the main operation
  }
}
