import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { toApiError, UnauthorizedError } from '@/lib/errors'
import { assertSameOrigin } from '@/lib/request-origin'
import { beginSubscription, ChurchSchema } from '@/services/subscriptions'

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const session = await auth()
    if (!session?.user?.id || session.user.onboardingStatus !== 'PENDING') throw new UnauthorizedError()
    const parsed = ChurchSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, message: 'Revisá los datos de tu iglesia' }, { status: 422 })
    return NextResponse.json({ ok: true, data: await beginSubscription(session.user.id, parsed.data) })
  } catch (error) {
    const { message, statusCode } = toApiError(error)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
