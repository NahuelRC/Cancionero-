import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPendingOnboardingInvitation } from '@/services/onboarding'
import { toApiError } from '@/lib/errors'

const TokenSchema = z.string().length(64).regex(/^[a-f0-9]+$/)

export async function GET(
  _req: Request,
  ctx: RouteContext<'/api/onboarding/[token]'>,
) {
  try {
    const { token } = await ctx.params
    const parsed = TokenSchema.safeParse(token)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Token invalido' }, { status: 422 })
    }

    const data = await getPendingOnboardingInvitation(parsed.data)
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
