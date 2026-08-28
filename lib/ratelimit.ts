import 'server-only'

interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

// Periodically purge expired buckets to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of store) {
    if (bucket.resetAt < now) store.delete(key)
  }
}, 60_000).unref?.()

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + opts.windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: opts.limit - 1, resetAt }
  }

  bucket.count += 1
  const success = bucket.count <= opts.limit
  return { success, remaining: Math.max(0, opts.limit - bucket.count), resetAt: bucket.resetAt }
}

export function getIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}
