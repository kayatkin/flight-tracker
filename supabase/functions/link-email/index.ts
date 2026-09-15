import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  cannotMergeTwoTelegrams,
  isEmailAlreadyRegistered,
  normalizeLinkEmail,
  pickCanonicalOwnerId,
  validateLinkEmailInput,
} from '../_shared/accountLink.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { RATE_LIMITS, rateLimitResponse } from '../_shared/rateLimit.ts';
import { bearerToken, verifyOwnerToken } from '../_shared/jwt.ts';

type IdentityRow = {
  user_id: string;
  provider: 'telegram' | 'email';
  provider_user_id: string;
  email: string | null;
};

const fail = (req: Request, error: string) => jsonResponse({ ok: false, error }, 200, req);

const adminClient = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const anonClient = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);

const loadIdentitiesForUser = async (
  admin: SupabaseClient,
  userId: string
): Promise<IdentityRow[]> => {
  const { data, error } = await admin
    .from('user_identities')
    .select('user_id, provider, provider_user_id, email')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as IdentityRow[];
};

const identityByProvider = (
  rows: IdentityRow[],
  provider: IdentityRow['provider']
): IdentityRow | undefined => rows.find((row) => row.provider === provider);

const countFlights = async (admin: SupabaseClient, userId: string): Promise<number> => {
  const { count, error } = await admin
    .from('user_flights')
    .select('flight_id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
};

const listedIdentities = async (admin: SupabaseClient, userId: string) => {
  const rows = await loadIdentitiesForUser(admin, userId);
  return rows.map((row) => ({
    provider: row.provider,
    provider_user_id: row.provider_user_id,
    email: row.email,
  }));
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  const limited = rateLimitResponse(req, 'link-email', RATE_LIMITS['link-email']);
  if (limited) return limited;

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405, req);
  }

  const token = bearerToken(req);
  if (!token) {
    return jsonResponse({ ok: false, error: 'Нужно войти как владелец' }, 401, req);
  }

  const owner = await verifyOwnerToken(token);
  if (!owner) {
    return jsonResponse({ ok: false, error: 'Нужно войти как владелец' }, 401, req);
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400, req);
  }

  const email = normalizeLinkEmail(body.email ?? '');
  const password = body.password ?? '';
  const invalid = validateLinkEmailInput(email, password);
  if (invalid) return fail(req, invalid);

  const admin = adminClient();
  const currentId = owner.userId;

  try {
    const currentIdentities = await loadIdentitiesForUser(admin, currentId);
    const currentEmail = identityByProvider(currentIdentities, 'email');
    const currentTelegram = identityByProvider(currentIdentities, 'telegram');

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name: owner.name || email.split('@')[0] },
    });

    let gotrueId: string;
    let createdNew = false;

    if (created.error || !created.data.user) {
      if (!isEmailAlreadyRegistered(created.error?.message)) {
        return fail(req, 'Не удалось создать email-аккаунт. Попробуйте ещё раз.');
      }

      const anon = anonClient();
      const signedIn = await anon.auth.signInWithPassword({ email, password });
      if (signedIn.error || !signedIn.data.user) {
        const message = (signedIn.error?.message ?? '').toLowerCase();
        if (message.includes('email not confirmed')) {
          return fail(req, 'Подтвердите email по ссылке из письма, затем привяжите снова.');
        }
        return fail(req, 'Неверный пароль для этого email');
      }
      gotrueId = signedIn.data.user.id;
      await anon.auth.signOut();
    } else {
      gotrueId = created.data.user.id;
      createdNew = true;
      const anon = anonClient();
      await anon.auth.resend({ type: 'signup', email }).catch(() => undefined);
    }

    if (currentEmail && currentEmail.provider_user_id !== gotrueId) {
      return fail(req, 'К этому аккаунту уже привязан другой email');
    }

    const { data: emailIdentity } = await admin
      .from('user_identities')
      .select('user_id, provider, provider_user_id, email')
      .eq('provider', 'email')
      .eq('provider_user_id', gotrueId)
      .maybeSingle();

    const emailSideId = (emailIdentity as IdentityRow | null)?.user_id ?? gotrueId;
    const emailSideIdentities = emailSideId === currentId
      ? currentIdentities
      : await loadIdentitiesForUser(admin, emailSideId);
    const emailSideTelegram = identityByProvider(emailSideIdentities, 'telegram');

    if (cannotMergeTwoTelegrams(currentTelegram?.provider_user_id, emailSideTelegram?.provider_user_id)) {
      return fail(req, 'Этот email уже привязан к другому Telegram-аккаунту');
    }

    const currentFlights = await countFlights(admin, currentId);
    const emailFlights = emailSideId === currentId ? currentFlights : await countFlights(admin, emailSideId);
    const canonicalUserId = pickCanonicalOwnerId(currentId, emailSideId, currentFlights, emailFlights);
    const merged = canonicalUserId !== currentId || canonicalUserId !== emailSideId;

    if (emailSideId !== canonicalUserId) {
      const { error } = await admin.rpc('reassign_owner', {
        from_id: emailSideId,
        to_id: canonicalUserId,
      });
      if (error) return fail(req, 'Не удалось объединить истории. Попробуйте ещё раз.');
    }
    if (currentId !== canonicalUserId) {
      const { error } = await admin.rpc('reassign_owner', {
        from_id: currentId,
        to_id: canonicalUserId,
      });
      if (error) return fail(req, 'Не удалось объединить истории. Попробуйте ещё раз.');
    }

    const telegramKey = currentTelegram?.provider_user_id
      ?? emailSideTelegram?.provider_user_id
      ?? (currentId.startsWith('tg_') ? currentId : null);

    if (telegramKey) {
      const { error } = await admin.from('user_identities').upsert({
        user_id: canonicalUserId,
        provider: 'telegram',
        provider_user_id: telegramKey,
      }, { onConflict: 'provider,provider_user_id' });
      if (error) return fail(req, 'Не удалось сохранить связку Telegram.');
    }

    const { error: emailError } = await admin.from('user_identities').upsert({
      user_id: canonicalUserId,
      provider: 'email',
      provider_user_id: gotrueId,
      email,
    }, { onConflict: 'provider,provider_user_id' });
    if (emailError) return fail(req, 'Не удалось сохранить связку email.');

    return jsonResponse({
      ok: true,
      canonicalUserId,
      merged,
      createdNew,
      needsConfirmation: createdNew,
      identities: await listedIdentities(admin, canonicalUserId),
    }, 200, req);
  } catch {
    return fail(req, 'Не удалось связать аккаунт. Попробуйте ещё раз.');
  }
});
