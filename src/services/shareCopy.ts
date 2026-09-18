import { t } from '@shared/i18n';
import type { SharePermissions } from './shareUrls';

export const buildInviteMessage = (params: {
  permissions: SharePermissions;
  webUrl: string;
  telegramUrl?: string | null;
}): string => {
  const base = params.permissions === 'edit'
    ? t('share.inviteEdit', { web: params.webUrl })
    : t('share.inviteView', { web: params.webUrl });
  if (params.telegramUrl && params.telegramUrl !== params.webUrl) {
    return `${base}\n\n${t('share.inviteTelegram', { telegram: params.telegramUrl })}`;
  }
  return base;
};

export const buildInviteLinks = (params: {
  webUrl: string;
  telegramUrl?: string | null;
}): string => {
  if (params.telegramUrl && params.telegramUrl !== params.webUrl) {
    return `${params.webUrl}\n${params.telegramUrl}`;
  }
  return params.webUrl;
};
