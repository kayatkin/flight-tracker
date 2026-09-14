import { describe, expect, it } from 'vitest';
import { passengerWord, permWord, t } from '../t';

describe('t', () => {
  it('returns catalog copy and interpolates variables', () => {
    expect(t('auth.submitLogin')).toBe('Войти');
    expect(t('form.notesTooLong', { max: 500 })).toBe('Заметка не длиннее 500 символов');
    expect(t('history.noResults', { query: 'Сочи' })).toBe('Ничего не найдено по запросу «Сочи»');
    expect(permWord('edit')).toBe('редактирование');
    expect(passengerWord(1)).toBe('пассажир');
    expect(passengerWord(3)).toBe('пассажира');
    expect(passengerWord(5)).toBe('пассажиров');
  });
});
