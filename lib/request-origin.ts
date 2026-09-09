import { ForbiddenError } from '@/lib/errors'

export function assertSameOrigin(request: Request) {
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin
  if (request.headers.get('origin') !== expected) throw new ForbiddenError('Origen no permitido')
}
