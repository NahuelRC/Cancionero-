import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/dal'
import { toApiError } from '@/lib/errors'
import { inviteChurchAdmin } from '@/services/super-admin'

const BodySchema = z.object({
  iglesiaId: z.string().min(1),
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const superAdmin = await requireSuperAdmin()
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'Datos inválidos', issues: parsed.error.flatten() },
        { status: 422 },
      )
    }

    await inviteChurchAdmin(superAdmin, parsed.data.iglesiaId, parsed.data.email)
    return NextResponse.json({ ok: true, data: { message: 'Invitación enviada' } }, { status: 201 })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
