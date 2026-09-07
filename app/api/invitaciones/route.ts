import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/dal'
import { listPendingInvitaciones } from '@/services/invitaciones'
import { toApiError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await requireTenant(['ADMIN'])
    const invitaciones = await listPendingInvitaciones(user)
    return NextResponse.json({ ok: true, data: invitaciones })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
