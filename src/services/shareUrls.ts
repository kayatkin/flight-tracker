import { env } from '@shared/config/env';
import type { SharePermissions } from './shareService';

export const buildShareUrl = (token: string, permissions: SharePermissions): string => {
  if (permissions === 'edit') {
    return `https://t.me/${env.telegramBotUsername}?startapp=${token}`;
  }
  const basePath = import.meta.env.BASE_URL || '/';
  const origin = env.isProd ? 'https://kayatkin.github.io' : window.location.origin;
  const path = `${origin}${basePath}`.replace(/\/?$/, '/');
  return `${path}?token=${encodeURIComponent(token)}`;
};
