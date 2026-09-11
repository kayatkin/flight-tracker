import { env } from '@shared/config/env';
import type { SharePermissions } from './shareService';

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

export const buildShareUrl = (token: string, permissions: SharePermissions): string => {
  if (permissions === 'edit') {
    const bot = env.telegramBotUsername.trim().replace(/^@/, '');
    if (bot) {
      return `https://t.me/${bot}?startapp=${encodeURIComponent(token)}`;
    }
  }
  return webShareUrl(token);
};
