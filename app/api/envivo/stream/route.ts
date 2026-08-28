import { requireTenant } from '@/lib/dal'
import { getEnVivoState } from '@/services/envivo'
import { toApiError } from '@/lib/errors'

export const runtime = 'nodejs'
// Vercel Pro supports up to 300s; Hobby caps at 60s.
// We close the stream at 55s so the client reconnects cleanly before any hard timeout.
export const maxDuration = 60

const POLL_INTERVAL_MS = 3_000
const MAX_OPEN_MS      = 55_000

export async function GET() {
  let user
  try {
    user = await requireTenant()
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return Response.json({ ok: false, message }, { status: statusCode })
  }

  const encoder = new TextEncoder()

  // Refs shared between start and cancel callbacks
  let intervalId: ReturnType<typeof setInterval> | undefined
  let timeoutId:  ReturnType<typeof setTimeout>  | undefined
  let closed = false

  function cleanup() {
    if (intervalId !== undefined) clearInterval(intervalId)
    if (timeoutId  !== undefined) clearTimeout(timeoutId)
    closed = true
  }

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          cleanup()
        }
      }

      // Send initial state immediately
      try {
        const state = await getEnVivoState(user)
        send(state)
      } catch {
        cleanup()
        controller.close()
        return
      }

      intervalId = setInterval(async () => {
        if (closed) return
        try {
          const state = await getEnVivoState(user)
          send(state)
        } catch {
          cleanup()
          controller.close()
        }
      }, POLL_INTERVAL_MS)

      // Close after MAX_OPEN_MS; EventSource auto-reconnects
      timeoutId = setTimeout(() => {
        cleanup()
        controller.close()
      }, MAX_OPEN_MS)
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
