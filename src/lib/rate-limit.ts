/**
 * Minimal in-memory sliding-window rate limiter. Suitable for a single-instance
 * deployment (the app runs one container per tenant/hub).
 */
type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }
  entry.count++;
  return { ok: true, retryAfterMs: 0 };
}