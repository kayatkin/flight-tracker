import { env } from '@shared/config/env';
import type { SharePermissions } from './shareService';

export const buildShareUrl = (token: string, permissions: SharePermissions): string => {
  if (permissions === 'edit') {
    return `https://t.me/${env.telegramBotUsername}?startapp=${encodeURIComponent(token)}`;
  }
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
