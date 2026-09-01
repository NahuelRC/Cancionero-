import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/dal'
import { toApiError } from '@/lib/errors'
import { listIglesiasWithAdmins } from '@/services/super-admin'

export async function GET() {
  try {
    await requireSuperAdmin()
    const iglesias = await listIglesiasWithAdmins()
    return NextResponse.json({ ok: true, data: iglesias })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
