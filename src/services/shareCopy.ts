import { t } from '@shared/i18n';
import type { SharePermissions } from './shareUrls';

export const buildInviteMessage = (params: {
  permissions: SharePermissions;
  shareUrl: string;
  webUrl: string;
}): string => {
  if (params.permissions === 'edit') {
    return t('share.inviteEdit', { telegram: params.shareUrl, web: params.webUrl });
  }
  return t('share.inviteView', { web: params.shareUrl });
};

/** Links only: edit invites include Telegram (edit) and web (view without Telegram). */
export const buildInviteLinks = (params: {
  permissions: SharePermissions;
  shareUrl: string;
  webUrl: string;
}): string => {
  if (params.permissions === 'edit' && params.webUrl && params.webUrl !== params.shareUrl) {
    return `${params.shareUrl}\n${params.webUrl}`;
  }
  return params.shareUrl;
};
