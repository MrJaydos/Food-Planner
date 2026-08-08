// Tiny in-memory sliding-window rate limiter. Suitable for a single-container
// self-hosted deployment (the whole app runs in one process). Counters reset on
// restart, which is acceptable for login-email throttling.

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  // Drop timestamps outside the window.
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: limit - bucket.hits.length,
    retryAfterSeconds: 0,
  };
}

// Occasionally sweep empty buckets to bound memory.
let lastSweep = Date.now();
export function maybeSweep(windowMs: number): void {
  const now = Date.now();
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  const cutoff = now - windowMs;
  for (const [key, bucket] of buckets) {
    if (bucket.hits.every((t) => t <= cutoff)) buckets.delete(key);
  }
}
