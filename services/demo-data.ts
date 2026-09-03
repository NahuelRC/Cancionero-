import 'server-only'
import type { Types } from 'mongoose'
import { Cancion } from '@/models/Cancion'
import type { SongSection, Tonalidad } from '@/types'

interface CreateDemoSongsInput {
  iglesiaId: Types.ObjectId
  userId: Types.ObjectId
}

const demoSongs: Array<{
  titulo: string
  artista: string
  tono: Tonalidad
  bpm: number
  compas: string
  tags: string[]
  secciones: SongSection[]
}> = [
  {
    titulo: 'Gracia Demo',
    artista: 'Klave Demo',
    tono: 'G',
    bpm: 74,
    compas: '4/4',
    tags: ['demo', 'adoracion'],
    secciones: [
      {
        label: 'Verso 1',
        lines: [
          {
            text: 'Tu gracia me encontro',
            chords: [
              { chord: 'G', position: 0 },
              { chord: 'D', position: 11 },
            ],
          },
          {
            text: 'Y nueva vida me dio',
            chords: [
              { chord: 'Em', position: 0 },
              { chord: 'C', position: 13 },
            ],
          },
        ],
      },
      {
        label: 'Coro',
        lines: [
          {
            text: 'Cantare de tu amor',
            chords: [
              { chord: 'G', position: 0 },
              { chord: 'D', position: 10 },
            ],
          },
          {
            text: 'Por siempre eres fiel',
            chords: [
              { chord: 'Em', position: 0 },
              { chord: 'C', position: 12 },
            ],
          },
        ],
      },
    ],
  },
  {
    titulo: 'Santo Demo',
    artista: 'Klave Demo',
    tono: 'C',
    bpm: 68,
    compas: '4/4',
    tags: ['demo', 'congregacional'],
    secciones: [
      {
        label: 'Verso',
        lines: [
          {
            text: 'Santo es el Senor',
            chords: [
              { chord: 'C', position: 0 },
              { chord: 'F', position: 9 },
            ],
          },
          {
            text: 'Digno de adoracion',
            chords: [
              { chord: 'Am', position: 0 },
              { chord: 'G', position: 11 },
            ],
          },
        ],
      },
      {
        label: 'Puente',
        lines: [
          {
            text: 'Tu iglesia canta hoy',
            chords: [
              { chord: 'F', position: 0 },
              { chord: 'G', position: 10 },
            ],
          },
          {
            text: 'Cristo reina aqui',
            chords: [
              { chord: 'C', position: 0 },
              { chord: 'G', position: 11 },
            ],
          },
        ],
      },
    ],
  },
]

export async function createDemoSongsForChurch({
  iglesiaId,
  userId,
}: CreateDemoSongsInput): Promise<void> {
  await Cancion.insertMany(
    demoSongs.map((song) => ({
      ...song,
      iglesiaId,
      creadoPor: userId,
    })),
  )
}
