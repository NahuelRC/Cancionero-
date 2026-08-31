import { NextRequest, NextResponse } from 'next/server'
import {
  handleMercadoPagoWebhook,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/mercadopago'
import { toApiError } from '@/lib/errors'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const dataId = req.nextUrl.searchParams.get('data.id') ?? payload?.data?.id ?? null

    const isValid = verifyMercadoPagoWebhookSignature({
      xSignature: req.headers.get('x-signature'),
      xRequestId: req.headers.get('x-request-id'),
      dataId,
    })

    if (!isValid) {
      return NextResponse.json({ ok: false, message: 'UNAUTHORIZED' }, { status: 401 })
    }

    if (!dataId) {
      return NextResponse.json({ ok: false, message: 'Datos invalidos' }, { status: 422 })
    }

    const result = await handleMercadoPagoWebhook(payload, dataId)
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}
