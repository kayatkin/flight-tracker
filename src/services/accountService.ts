import { supabase } from '@shared/lib';
import { isRealTelegramUser } from '@shared/utils/telegramUserType';
import { logError } from '@shared/utils/logger';
import { authenticateTelegram } from './authService';
import {
  type AccountIdentity,
  validateLinkEmailForm,
} from './accountLink';

export type { AccountIdentity } from './accountLink';
export {
  cannotMergeTwoTelegrams,
  pickCanonicalOwnerId,
  summarizeIdentities,
  validateLinkEmailForm,
} from './accountLink';

export type LinkEmailResult = {
  ok: boolean;
  canonicalUserId?: string;
  merged?: boolean;
  needsConfirmation?: boolean;
  identities?: AccountIdentity[];
  error?: string;
};

const asIdentity = (row: {
  provider?: string;
  provider_user_id?: string;
  email?: string | null;
}): AccountIdentity | null => {
  if (row.provider !== 'telegram' && row.provider !== 'email') return null;
  if (!row.provider_user_id) return null;
  return {
    provider: row.provider,
    provider_user_id: row.provider_user_id,
    email: row.email ?? null,
  };
};

export const loadIdentities = async (): Promise<AccountIdentity[]> => {
  const { data, error } = await supabase
    .from('user_identities')
    .select('provider, provider_user_id, email');
  if (error) {
    logError('[ACCOUNT] Failed to load identities', error);
    return [];
  }
  return (data ?? []).map(asIdentity).filter((row): row is AccountIdentity => row !== null);
};

export const linkEmailAccount = async (
  email: string,
  password: string,
  confirmPassword?: string
): Promise<LinkEmailResult> => {
  const invalid = validateLinkEmailForm({ email, password, confirmPassword });
  if (invalid) return { ok: false, error: invalid };

  const { data, error } = await supabase.functions.invoke<LinkEmailResult>('link-email', {
    body: { email: email.trim(), password },
  });

  if (error) {
    logError('[ACCOUNT] link-email invoke error:', error);
    return { ok: false, error: 'Не удалось связать аккаунт. Попробуйте ещё раз.' };
  }
  if (!data?.ok) {
    return { ok: false, error: data?.error ?? 'Не удалось связать аккаунт. Попробуйте ещё раз.' };
  }
  return data;
};

/** Re-issue Telegram JWT or refresh GoTrue so user_id matches the canonical owner. */
export const refreshOwnerAfterLink = async (): Promise<void> => {
  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
  if (initData && isRealTelegramUser()) {
    await authenticateTelegram(initData);
    return;
  }
  await supabase.auth.refreshSession();
};
