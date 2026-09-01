import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/dal'
import { toApiError } from '@/lib/errors'
import { revokeChurchAdmin } from '@/services/super-admin'

export async function DELETE(
  _req: Request,
  ctx: RouteContext<'/api/super-admin/admins/[id]'>,
) {
  try {
    const { id } = await ctx.params
    const superAdmin = await requireSuperAdmin()
    await revokeChurchAdmin(superAdmin, id)
    return NextResponse.json({ ok: true, data: null })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
