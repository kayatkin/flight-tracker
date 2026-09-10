import { describe, expect, it } from 'vitest';
import {
  resolveInitSaveStatus,
  saveStatusText,
  type SaveStatus,
} from '../saveStatus';

describe('saveStatusText', () => {
  it.each<[SaveStatus, string | null]>([
    ['idle', null],
    ['pending', 'Сохранение…'],
    ['saving', 'Сохранение…'],
    ['saved', 'Сохранено'],
    ['error', 'Не сохранено'],
    ['offline', 'Только на устройстве'],
    ['readonly', 'Только просмотр'],
  ])('%s → %s', (status, expected) => {
    expect(saveStatusText(status)).toBe(expected);
  });
});

describe('resolveInitSaveStatus', () => {
  it('marks view guests as readonly even without a cloud hydrate', () => {
    expect(resolveInitSaveStatus({ hydrated: false, isViewGuest: true })).toBe('readonly');
  });

  it('marks a failed hydrate as offline', () => {
    expect(resolveInitSaveStatus({ hydrated: false, isViewGuest: false })).toBe('offline');
  });

  it('stays idle after a successful owner hydrate', () => {
    expect(resolveInitSaveStatus({ hydrated: true, isViewGuest: false })).toBe('idle');
  });
});
