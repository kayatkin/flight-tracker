import { t } from '@shared/i18n';

export const MIN_LINK_PASSWORD_LENGTH = 6;

export type AccountIdentity = {
  provider: 'telegram' | 'email';
  provider_user_id: string;
  email: string | null;
};

export type AccountLinkSummary = {
  hasTelegram: boolean;
  hasEmail: boolean;
  email: string | null;
};

export const normalizeLinkEmail = (email: string): string => email.trim().toLowerCase();

export const validateLinkEmailForm = (params: {
  email: string;
  password: string;
  confirmPassword?: string;
}): string | null => {
  const email = normalizeLinkEmail(params.email);
  if (!email || !email.includes('@')) {
    return t('auth.invalidEmail');
  }
  if (params.password.length < MIN_LINK_PASSWORD_LENGTH) {
    return t('auth.shortPassword');
  }
  if (params.confirmPassword !== undefined && params.password !== params.confirmPassword) {
    return t('auth.mismatch');
  }
  return null;
};

/** Keep the richer history; on a tie keep the current session. */
export const pickCanonicalOwnerId = (
  currentId: string,
  otherId: string,
  currentFlightCount: number,
  otherFlightCount: number
): string => {
  if (!otherId || otherId === currentId) return currentId;
  if (otherFlightCount > currentFlightCount) return otherId;
  return currentId;
};

export const cannotMergeTwoTelegrams = (
  currentTelegramId: string | null | undefined,
  otherTelegramId: string | null | undefined
): boolean =>
  Boolean(currentTelegramId && otherTelegramId && currentTelegramId !== otherTelegramId);

export const summarizeIdentities = (identities: AccountIdentity[]): AccountLinkSummary => {
  const emailRow = identities.find((row) => row.provider === 'email');
  return {
    hasTelegram: identities.some((row) => row.provider === 'telegram'),
    hasEmail: Boolean(emailRow),
    email: emailRow?.email ?? null,
  };
};
