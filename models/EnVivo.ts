import mongoose, { Document, Schema, Types } from 'mongoose'

const TONALIDADES = [
  'C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B',
]

export interface IEnVivoCancion {
  cancionId: Types.ObjectId
  tono: string
}

export interface IEnVivo extends Document {
  iglesiaId: Types.ObjectId
  nombre: string
  fecha: Date
  activo: boolean
  canciones: IEnVivoCancion[]
  cancionActivaIdx: number  // -1 = ninguna
  createdAt: Date
  updatedAt: Date
}

const EnVivoCancionSchema = new Schema<IEnVivoCancion>(
  {
    cancionId: { type: Schema.Types.ObjectId, ref: 'Cancion', required: true },
    tono:      { type: String, enum: TONALIDADES, required: true },
  },
  { _id: false },
)

const EnVivoSchema = new Schema<IEnVivo>(
  {
    iglesiaId:       { type: Schema.Types.ObjectId, ref: 'Iglesia', required: true },
    nombre:          { type: String, default: 'Sesión' },
    fecha:           { type: Date, required: true },
    activo:          { type: Boolean, default: true },
    canciones:       { type: [EnVivoCancionSchema], default: [] },
    cancionActivaIdx: { type: Number, default: -1 },
  },
  { timestamps: true },
)

// Garantiza un único documento activo por iglesia a nivel DB
EnVivoSchema.index(
  { iglesiaId: 1 },
  { unique: true, partialFilterExpression: { activo: true }, name: 'unique_active_per_iglesia' },
)
// Lookup rápido de la sesión activa
EnVivoSchema.index({ iglesiaId: 1, activo: 1 })
// Historial ordenado por fecha
EnVivoSchema.index({ iglesiaId: 1, fecha: -1 })

export const EnVivo =
  (mongoose.models.EnVivo as mongoose.Model<IEnVivo>) ??
  mongoose.model<IEnVivo>('EnVivo', EnVivoSchema)
