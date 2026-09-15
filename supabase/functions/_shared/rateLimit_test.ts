import { consumeRateLimit, rateLimitResponse, resetRateLimitForTests } from './rateLimit.ts';

const req = (ip: string) =>
  new Request('https://example.test/fn', { headers: { 'x-forwarded-for': ip } });

Deno.test.beforeEach(() => {
  resetRateLimitForTests();
});

Deno.test('allows up to the limit then returns 429', () => {
  const a = req('1.1.1.1');
  if (!consumeRateLimit(a, 'auth-guest', 2).ok) throw new Error('first should pass');
  if (!consumeRateLimit(a, 'auth-guest', 2).ok) throw new Error('second should pass');
  const third = consumeRateLimit(a, 'auth-guest', 2);
  if (third.ok) throw new Error('third should fail');
  const blocked = rateLimitResponse(a, 'auth-guest', 2);
  if (!blocked || blocked.status !== 429) throw new Error('expected 429');
});

Deno.test('isolates buckets by IP and function name', () => {
  if (!consumeRateLimit(req('1.1.1.1'), 'auth-guest', 1).ok) throw new Error('a');
  if (consumeRateLimit(req('1.1.1.1'), 'auth-guest', 1).ok) throw new Error('same IP blocked');
  if (!consumeRateLimit(req('8.8.8.8'), 'auth-guest', 1).ok) throw new Error('other IP');
  if (!consumeRateLimit(req('1.1.1.1'), 'auth-refresh', 1).ok) throw new Error('other function');
});
