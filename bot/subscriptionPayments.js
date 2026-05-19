/**
 * Telegram Stars → Supabase subscriptions (service role).
 */

const PERIOD_DAYS = { monthly: 30, annual: 365 };

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function activateProSubscription(supabase, { userId, period, chargeId, starsAmount }) {
  const days = PERIOD_DAYS[period] ?? 30;

  const { data: existingPayment } = await supabase
    .from('payment_events')
    .select('telegram_payment_charge_id')
    .eq('telegram_payment_charge_id', chargeId)
    .maybeSingle();

  if (existingPayment) {
    console.log(`[payment] duplicate charge ${chargeId}, skip`);
    return { ok: true, duplicate: true };
  }

  const { data: current } = await supabase
    .from('subscriptions')
    .select('expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  const now = Date.now();
  let base = now;
  if (current?.expires_at) {
    const currentExpiry = new Date(current.expires_at).getTime();
    if (currentExpiry > now) base = currentExpiry;
  }
  const expiresAt = new Date(base + days * 24 * 60 * 60 * 1000);

  const { error: payError } = await supabase.from('payment_events').insert({
    telegram_payment_charge_id: chargeId,
    user_id: userId,
    plan_period: period,
    stars_amount: starsAmount,
  });

  if (payError) {
    console.error('[payment] payment_events insert failed:', payError);
    throw payError;
  }

  const { error: subError } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    plan: 'premium',
    status: 'active',
    expires_at: expiresAt.toISOString(),
    provider: 'telegram_stars',
    external_id: chargeId,
    updated_at: new Date().toISOString(),
  });

  if (subError) {
    console.error('[payment] subscriptions upsert failed:', subError);
    throw subError;
  }

  console.log(`[payment] Pro activated for ${userId} until ${expiresAt.toISOString()}`);
  return { ok: true, expiresAt: expiresAt.toISOString() };
}

function parseInvoicePayload(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data?.u || !data?.p) return null;
    if (data.v !== 1) return null;
    if (data.p !== 'monthly' && data.p !== 'annual') return null;
    return { userId: data.u, period: data.p };
  } catch {
    return null;
  }
}

module.exports = { activateProSubscription, parseInvoicePayload, PERIOD_DAYS };
