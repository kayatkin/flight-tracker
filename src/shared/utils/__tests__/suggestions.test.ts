import { describe, it, expect } from 'vitest';
import { mergeSuggestions } from '../suggestions';

describe('mergeSuggestions', () => {
  it('puts saved values first and then catalog entries', () => {
    expect(mergeSuggestions(['Сочи'], ['Москва', 'Сочи', 'Тбилиси'])).toEqual([
      'Сочи',
      'Москва',
      'Тбилиси',
    ]);
  });

  it('deduplicates case-insensitively and keeps the first spelling', () => {
    expect(mergeSuggestions(['s7'], ['S7', 'Aeroflot'])).toEqual(['s7', 'Aeroflot']);
  });

  it('skips empty strings', () => {
    expect(mergeSuggestions(['  ', 'Казань'], ['', 'Казань'])).toEqual(['Казань']);
  });
});
