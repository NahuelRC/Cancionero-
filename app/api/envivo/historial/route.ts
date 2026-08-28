import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenant } from '@/lib/dal'
import { getEnVivoHistorial } from '@/services/envivo'
import { toApiError } from '@/lib/errors'

const QuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export async function GET(req: NextRequest) {
  try {
    const user   = await requireTenant()
    const params = Object.fromEntries(req.nextUrl.searchParams)
    const parsed = QuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Parámetros inválidos' }, { status: 422 })
    }
    const result = await getEnVivoHistorial(user, parsed.data)
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
