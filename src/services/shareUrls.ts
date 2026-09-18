import { env } from '@shared/config/env';

export type SharePermissions = 'view' | 'edit';

const webShareUrl = (token: string): string => {
  const basePath = import.meta.env.BASE_URL || '/';
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : env.isProd
        ? 'https://kayatkin.github.io'
        : 'http://localhost:5173';
  const path = `${origin}${basePath}`.replace(/\/?$/, '/');
  return `${path}?token=${encodeURIComponent(token)}`;
};

/** Canonical invite: opens in the browser and can be pasted into Mini App. */
export const buildWebShareUrl = (token: string): string => webShareUrl(token);

export const buildTelegramShareUrl = (token: string): string | null => {
  const bot = env.telegramBotUsername.trim().replace(/^@/, '');
  if (!bot) return null;
  return `https://t.me/${bot}?startapp=${encodeURIComponent(token)}`;
};

/** Same web URL for view and edit — permission lives on the invite, not in the host. */
export const buildShareUrl = (token: string, _permissions?: SharePermissions): string =>
  webShareUrl(token);
