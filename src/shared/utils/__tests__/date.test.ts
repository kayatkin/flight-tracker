import { describe, it, expect } from 'vitest';
import { monthIndexFromISODate, parseISODateParts, toLocalISODate } from '../date';

describe('date helpers', () => {
  it('parses ISO calendar dates without UTC shift', () => {
    expect(parseISODateParts('2026-06-15')).toEqual({ year: 2026, month: 6, day: 15 });
    expect(monthIndexFromISODate('2026-01-01')).toBe(0);
    expect(monthIndexFromISODate('2026-12-31')).toBe(11);
  });

  it('rejects invalid dates', () => {
    expect(parseISODateParts('not-a-date')).toBeNull();
    expect(monthIndexFromISODate('2026-13-01')).toBeNull();
  });

  it('formats local today as YYYY-MM-DD', () => {
    expect(toLocalISODate(new Date(2026, 8, 6))).toBe('2026-09-06');
  });
});
