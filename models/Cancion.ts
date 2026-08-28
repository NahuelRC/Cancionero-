import mongoose, { Document, Schema, Types } from 'mongoose'
import type { SongSection, Tonalidad } from '@/types'

export interface ICancion extends Document {
  iglesiaId: Types.ObjectId
  titulo: string
  artista?: string
  tono: Tonalidad
  bpm?: number
  compas?: string
  secciones: SongSection[]
  tags: string[]
  creadoPor: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ChordAnnotationSchema = new Schema(
  {
    chord:    { type: String, required: true },
    position: { type: Number, required: true },
  },
  { _id: false },
)

const SongLineSchema = new Schema(
  {
    text:   { type: String, default: '' },
    chords: { type: [ChordAnnotationSchema], default: [] },
  },
  { _id: false },
)

const SongSectionSchema = new Schema(
  {
    label: { type: String, required: true },
    lines: { type: [SongLineSchema], default: [] },
  },
  { _id: false },
)

const TONALIDADES: Tonalidad[] = [
  'C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B',
]

const CancionSchema = new Schema<ICancion>(
  {
    iglesiaId:  { type: Schema.Types.ObjectId, ref: 'Iglesia', required: true },
    titulo:     { type: String, required: true, trim: true },
    artista:    { type: String, trim: true },
    tono:       { type: String, enum: TONALIDADES, required: true },
    bpm:        Number,
    compas:     { type: String, trim: true },
    secciones:  { type: [SongSectionSchema], default: [] },
    tags:       { type: [String], default: [] },
    creadoPor:  { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  },
  { timestamps: true },
)

CancionSchema.index({ iglesiaId: 1, createdAt: -1 })
CancionSchema.index({ iglesiaId: 1, titulo: 1 })
CancionSchema.index({ iglesiaId: 1, artista: 1, titulo: 1 })
CancionSchema.index({ iglesiaId: 1, tags: 1 })

export const Cancion =
  (mongoose.models.Cancion as mongoose.Model<ICancion>) ??
  mongoose.model<ICancion>('Cancion', CancionSchema)
