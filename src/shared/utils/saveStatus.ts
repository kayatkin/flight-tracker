import { t } from '@shared/i18n';

export type SaveStatus =
  | 'idle'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'error'
  | 'offline'
  | 'readonly';

export function saveStatusText(status: SaveStatus): string | null {
  switch (status) {
    case 'pending':
    case 'saving':
      return t('save.saving');
    case 'saved':
      return t('save.saved');
    case 'error':
      return t('save.error');
    case 'offline':
      return t('save.offline');
    case 'readonly':
      return t('save.readonly');
    case 'idle':
    default:
      return null;
  }
}

export function resolveInitSaveStatus(params: {
  hydrated: boolean;
  isViewGuest: boolean;
}): SaveStatus {
  if (params.isViewGuest) return 'readonly';
  if (!params.hydrated) return 'offline';
  return 'idle';
}
