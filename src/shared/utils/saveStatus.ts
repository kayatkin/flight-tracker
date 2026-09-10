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
      return 'Сохранение…';
    case 'saved':
      return 'Сохранено';
    case 'error':
      return 'Не сохранено';
    case 'offline':
      return 'Только на устройстве';
    case 'readonly':
      return 'Только просмотр';
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
