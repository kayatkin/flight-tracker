import { corsHeaders } from './cors.ts';

interface Bucket {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60_000;
const store = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? '').trim();
  return (real || 'unknown').slice(0, 64);
}

export function consumeRateLimit(
  req: Request,
  name: string,
  limit: number,
  windowMs = WINDOW_MS,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const key = `${name}:${clientIp(req)}`;
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000)),
    };
  }
  bucket.count += 1;
  return { ok: true };
}

/** Best-effort per-isolate cap. Returns 429 response when the bucket is full. */
export function rateLimitResponse(req: Request, name: string, limit: number): Response | null {
  const result = consumeRateLimit(req, name, limit);
  if (result.ok) return null;
  return new Response(JSON.stringify({ ok: false, error: 'Too many requests' }), {
    status: 429,
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'application/json',
      'Retry-After': String(result.retryAfterSec),
    },
  });
}

export function resetRateLimitForTests(): void {
  store.clear();
}

export const RATE_LIMITS = {
  'auth-telegram': 30,
  'auth-guest': 20,
  'auth-refresh': 60,
  'link-email': 10,
  'fx-usd': 30,
} as const;
