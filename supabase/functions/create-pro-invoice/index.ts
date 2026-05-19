import { corsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts';
import { parseTelegramUser, validateTelegramInitData } from '../_shared/telegram.ts';

const PERIOD_STARS: Record<string, number> = {
  monthly: 199,
  annual: 999,
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const botToken = Deno.env.get('BOT_TOKEN');
  if (!botToken) {
    return jsonResponse({ error: 'BOT_TOKEN secret is not configured' }, 500);
  }

  let body: { initData?: string; period?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { initData, period } = body;
  if (!initData || !(await validateTelegramInitData(initData, botToken))) {
    return jsonResponse({ error: 'Invalid Telegram initData' }, 401);
  }

  if (period !== 'monthly' && period !== 'annual') {
    return jsonResponse({ error: 'Invalid period' }, 400);
  }

  const tgUser = parseTelegramUser(initData);
  if (!tgUser?.id) {
    return jsonResponse({ error: 'No Telegram user in initData' }, 400);
  }

  const userId = `tg_${tgUser.id}`;
  const stars = PERIOD_STARS[period];
  const payload = JSON.stringify({ v: 1, u: userId, p: period });

  const title = period === 'annual' ? 'Flight Tracker Pro — 1 year' : 'Flight Tracker Pro — 1 month';
  const description =
    period === 'annual'
      ? 'Unlimited routes, flights, charts, and sharing.'
      : 'Unlimited routes, flights, charts, and sharing for 30 days.';

  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      description,
      payload,
      currency: 'XTR',
      prices: [{ label: 'Flight Tracker Pro', amount: stars }],
    }),
  });

  const tgJson = await tgRes.json();
  if (!tgJson.ok || !tgJson.result) {
    console.error('[create-pro-invoice] Telegram API error:', tgJson);
    return jsonResponse({ error: 'Failed to create invoice', details: tgJson.description }, 502);
  }

  return jsonResponse({
    invoiceUrl: tgJson.result as string,
    period,
    stars,
    userId,
  });
});
