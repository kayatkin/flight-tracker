export const MIN_LINK_PASSWORD_LENGTH = 8;

export const normalizeLinkEmail = (email: string): string => email.trim().toLowerCase();

export const validateLinkEmailInput = (email: string, password: string): string | null => {
  const normalized = normalizeLinkEmail(email);
  if (!normalized || !normalized.includes('@')) {
    return 'Укажите действующий email';
  }
  if (password.length < MIN_LINK_PASSWORD_LENGTH) {
    return 'Пароль не короче 8 символов';
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

export const isEmailAlreadyRegistered = (message: string | undefined): boolean => {
  const text = (message ?? '').toLowerCase();
  return text.includes('already been registered') || text.includes('already registered');
};
