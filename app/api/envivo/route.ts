import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenant } from '@/lib/dal'
import {
  getEnVivoState,
  createEnVivo,
  duplicateEnVivoFromHistory,
  renameEnVivo,
  addCancionToSet,
  removeCancionFromSet,
  moveCancionInSet,
  setActiveCancion,
  updateCancionTono,
  stopEnVivo,
} from '@/services/envivo'
import { toApiError } from '@/lib/errors'

export async function GET() {
  try {
    const user  = await requireTenant()
    const state = await getEnVivoState(user)
    return NextResponse.json({ ok: true, data: state })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}

const CreateSchema = z.object({
  nombre: z.string().max(100).optional(),
  fecha:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sourceSessionId: z.string().min(1).optional(),
  cancionIds: z.array(z.string().min(1)).max(50).optional(),
}).refine((data) => !(data.sourceSessionId && data.cancionIds?.length), {
  message: 'sourceSessionId y cancionIds no se pueden combinar',
  path: ['sourceSessionId'],
})

export async function POST(req: NextRequest) {
  try {
    const user   = await requireTenant(['ADMIN'])
    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 422 })
    }
    const state = parsed.data.sourceSessionId
      ? await duplicateEnVivoFromHistory(user, parsed.data.sourceSessionId, parsed.data)
      : await createEnVivo(user, parsed.data)
    return NextResponse.json({ ok: true, data: state }, { status: 201 })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}

const PatchSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('stop') }),
  z.object({ op: z.literal('rename'), nombre: z.string().trim().min(1).max(100) }),
  z.object({ op: z.literal('setActive'),   idx: z.number().int().min(-1) }),
  z.object({ op: z.literal('addCancion'),  cancionId: z.string().min(1) }),
  z.object({ op: z.literal('removeCancion'), idx: z.number().int().min(0) }),
  z.object({ op: z.literal('moveCancion'), fromIdx: z.number().int().min(0), toIdx: z.number().int().min(0) }),
  z.object({
    op: z.literal('setTono'),
    idx: z.number().int().min(0),
    tono: z.enum(['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B']),
  }),
])

export async function PATCH(req: NextRequest) {
  try {
    const user   = await requireTenant()
    const body   = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 422 })
    }

    let state
    switch (parsed.data.op) {
      case 'stop':
        state = await stopEnVivo(user)
        break
      case 'rename':
        state = await renameEnVivo(user, parsed.data.nombre)
        break
      case 'setActive':
        state = await setActiveCancion(user, parsed.data.idx)
        break
      case 'addCancion':
        state = await addCancionToSet(user, parsed.data.cancionId)
        break
      case 'removeCancion':
        state = await removeCancionFromSet(user, parsed.data.idx)
        break
      case 'moveCancion':
        state = await moveCancionInSet(user, parsed.data.fromIdx, parsed.data.toIdx)
        break
      case 'setTono':
        state = await updateCancionTono(user, parsed.data.idx, parsed.data.tono as Parameters<typeof updateCancionTono>[2])
        break
    }

    return NextResponse.json({ ok: true, data: state })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
