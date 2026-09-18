import { describe, expect, it } from 'vitest';
import { passengerWord, permWord, t, ticketWord } from '../t';

describe('t', () => {
  it('returns catalog copy and interpolates variables', () => {
    expect(t('auth.submitLogin')).toBe('Войти');
    expect(t('share.inviteEdit')).toContain('Telegram и регистрация не нужны');
    expect(t('share.inviteEdit')).toContain('менять билеты');
    expect(t('share.inviteEdit')).not.toContain('RunApp');
    expect(t('share.inviteView')).toContain('Telegram и регистрация не нужны');
    expect(t('invites.emptyHint')).toContain('Поделиться');
    expect(t('invites.listActive')).toBe('Список активных приглашений');
    expect(t('form.notesTooLong', { max: 500 })).toBe('Заметка не длиннее 500 символов');
    expect(t('history.noResults', { query: 'Сочи' })).toBe('Ничего не найдено по запросу «Сочи»');
    expect(permWord('edit')).toBe('редактирование');
    expect(passengerWord(1)).toBe('пассажир');
    expect(passengerWord(3)).toBe('пассажира');
    expect(passengerWord(5)).toBe('пассажиров');
    expect(ticketWord(1)).toBe('билет');
    expect(ticketWord(2)).toBe('билета');
    expect(ticketWord(5)).toBe('билетов');
    expect(ticketWord(21)).toBe('билет');
  });
});
