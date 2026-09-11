import { describe, it, expect } from 'vitest';
import { createEmptyFlightForm } from '../flightFormMapping';
import {
  FORM_DRAFT_STORAGE_KEY,
  EDIT_FORM_DRAFT_STORAGE_KEY,
  parseFormDraft,
  readFormDraft,
  writeFormDraft,
  clearFormDraft,
  readEditFormDraft,
  writeEditFormDraft,
  clearEditFormDraft,
} from '../formDraft';

const memoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    store,
  };
};

describe('parseFormDraft', () => {
  it('returns null for empty or invalid payloads', () => {
    expect(parseFormDraft(null, '2026-09-10')).toBeNull();
    expect(parseFormDraft('{', '2026-09-10')).toBeNull();
    expect(parseFormDraft('[]', '2026-09-10')).toBeNull();
  });

  it('ignores a payload that still matches an empty form', () => {
    const empty = createEmptyFlightForm('2026-09-10');
    expect(parseFormDraft(JSON.stringify(empty), '2026-09-10')).toBeNull();
  });

  it('restores typed fields and drops unknown junk', () => {
    const draft = parseFormDraft(JSON.stringify({
      origin: 'Москва',
      destination: 'Тбилиси',
      type: 'roundTrip',
      passengers: 3,
      totalPrice: '15000',
      notes: 'Окно',
      extra: 'nope',
      isDirectThere: false,
    }), '2026-09-10');

    expect(draft?.origin).toBe('Москва');
    expect(draft?.destination).toBe('Тбилиси');
    expect(draft?.type).toBe('roundTrip');
    expect(draft?.passengers).toBe(3);
    expect(draft?.notes).toBe('Окно');
    expect(draft?.isDirectThere).toBe(false);
    expect(draft && 'extra' in draft).toBe(false);
  });

  it('falls back to safe defaults for broken types', () => {
    const draft = parseFormDraft(JSON.stringify({
      origin: 'Москва',
      type: 'spaceship',
      passengers: 9,
      isDirectThere: 'yes',
      layoverDurationThere: -4,
    }), '2026-09-10');

    expect(draft?.type).toBe('oneWay');
    expect(draft?.passengers).toBe(1);
    expect(draft?.isDirectThere).toBe(true);
    expect(draft?.layoverDurationThere).toBe(60);
  });
});

describe('form draft storage', () => {
  it('writes, reads and clears session storage', () => {
    const storage = memoryStorage();
    const filled = { ...createEmptyFlightForm('2026-09-10'), origin: 'Москва' };

    writeFormDraft(filled, storage);
    expect(storage.store.get(FORM_DRAFT_STORAGE_KEY)).toContain('Москва');
    expect(readFormDraft(storage, '2026-09-10')?.origin).toBe('Москва');

    clearFormDraft(storage);
    expect(storage.store.has(FORM_DRAFT_STORAGE_KEY)).toBe(false);
    expect(readFormDraft(storage, '2026-09-10')).toBeNull();
  });
});

describe('edit form draft storage', () => {
  it('restores only when the flight id matches', () => {
    const storage = memoryStorage();
    const filled = { ...createEmptyFlightForm('2026-09-10'), origin: 'Казань' };
    writeEditFormDraft('flight-1', filled, storage);

    expect(storage.store.get(EDIT_FORM_DRAFT_STORAGE_KEY)).toContain('Казань');
    expect(readEditFormDraft('flight-1', storage, '2026-09-10')?.origin).toBe('Казань');
    expect(readEditFormDraft('flight-2', storage, '2026-09-10')).toBeNull();

    clearEditFormDraft(storage);
    expect(storage.store.has(EDIT_FORM_DRAFT_STORAGE_KEY)).toBe(false);
    expect(readEditFormDraft('flight-1', storage, '2026-09-10')).toBeNull();
  });
});
