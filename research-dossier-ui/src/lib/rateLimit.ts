/**
 * Minimal in-memory rate limiter. Good enough to stop casual abuse of a
 * public demo link; NOT good enough for real production multi-tenancy.
 *
 * Known limitation, stated plainly: this state lives in one serverless
 * function instance's memory. Vercel can run multiple instances of the
 * same route concurrently, and a cold start wipes this map - so a
 * determined abuser spreading requests across instances isn't actually
 * stopped. The real fix is a shared store (Upstash Redis's rate-limit
 * package is the standard choice on Vercel). This is a stopgap for "survive
 * a public contest demo link for a few days," not a real rate limiter.
 */

const hits = new Map<string, number[]>()

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs)

  if (timestamps.length >= limit) {
    hits.set(key, timestamps)
    return true
  }

  timestamps.push(now)
  hits.set(key, timestamps)
  return false
}

export function getClientKey(req: Request): string {
  // Vercel sets x-forwarded-for; fall back to a constant if absent (local dev)
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}