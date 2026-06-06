// Lightweight in-memory, fixed-window rate limiter keyed by client IP.
//
// NOTE: serverless platforms (Vercel) may run multiple instances, so this is
// best-effort — it bounds casual abuse without any external dependency. For a
// hard, cluster-wide guarantee, back it with Upstash Redis / Vercel KV instead.

type Window = { count: number; resetAt: number };

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10; // per IP per window

const hits = new Map<string, Window>();

// Opportunistically evict stale windows so the map doesn't grow unbounded.
function sweep(now: number) {
  if (hits.size < 5000) return;
  for (const [key, w] of hits) {
    if (w.resetAt <= now) hits.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  ip: string,
  max = MAX_REQUESTS,
  windowMs = WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = hits.get(ip);
  if (!existing || existing.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: max - existing.count,
    retryAfterSeconds: 0
  };
}

// Derives a best-effort client IP from common proxy headers.
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}
