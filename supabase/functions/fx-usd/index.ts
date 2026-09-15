import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { cbrDailyUrl, parseCbrUsdRate, type CbrUsdRate } from '../_shared/cbrUsd.ts';
import { RATE_LIMITS, rateLimitResponse } from '../_shared/rateLimit.ts';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DATES = 60;
const cache = new Map<string, CbrUsdRate>();

const uniqueDates = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (typeof value !== 'string' || !ISO_DATE.test(value.trim())) continue;
    seen.add(value.trim());
    if (seen.size >= MAX_DATES) break;
  }
  return [...seen];
};

const fetchUsdRate = async (isoDate: string): Promise<CbrUsdRate | null> => {
  const cached = cache.get(isoDate);
  if (cached) return cached;
  const url = cbrDailyUrl(isoDate);
  if (!url) return null;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/xml,text/xml,*/*',
      'User-Agent': 'FlightTracker/1.0 (CBR daily rates)',
    },
  });
  if (!res.ok) return null;
  const xml = await res.text();
  const parsed = parseCbrUsdRate(xml);
  if (!parsed) return null;
  cache.set(isoDate, parsed);
  return parsed;
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  const limited = rateLimitResponse(req, 'fx-usd', RATE_LIMITS['fx-usd']);
  if (limited) return limited;

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405, req);
  }

  let body: { dates?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400, req);
  }

  const dates = uniqueDates(body.dates);
  const rates: Record<string, CbrUsdRate> = {};
  const queue = [...dates];
  const workerCount = Math.min(4, queue.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const isoDate = queue.shift();
      if (!isoDate) break;
      try {
        const parsed = await fetchUsdRate(isoDate);
        if (parsed) rates[isoDate] = parsed;
      } catch {
        // Skip a single CBR miss; other dates still return.
      }
    }
  }));

  return jsonResponse({ ok: true, rates }, 200, req);
});
