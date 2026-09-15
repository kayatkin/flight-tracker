import { describe, it, expect } from 'vitest';
import { formatExcelNumber, formatRubAndUsd, formatUsd, rubToUsd } from '../fx';

describe('rubToUsd', () => {
  it('divides rubles by the CBR USD rate', () => {
    expect(rubToUsd(9000, 90)).toBe(100);
    expect(rubToUsd(8123.45, 81.2345)).toBeCloseTo(100, 5);
  });

  it('rejects non-positive rates and non-finite amounts', () => {
    expect(rubToUsd(1000, 0)).toBeNull();
    expect(rubToUsd(1000, -90)).toBeNull();
    expect(rubToUsd(Number.NaN, 90)).toBeNull();
  });
});

describe('format helpers', () => {
  it('formats USD with a ru-RU decimal comma', () => {
    expect(formatUsd(137.42)).toBe('137,42 $');
  });

  it('keeps rubles only when the rate is missing', () => {
    expect(formatRubAndUsd(15000, undefined)).toMatch(/15[\s\u00a0\u202f]000 ₽$/);
    expect(formatRubAndUsd(15000, 90)).toContain('166,67 $');
  });

  it('writes Excel numbers without a thousands separator', () => {
    expect(formatExcelNumber(30000)).toBe('30000');
    expect(formatExcelNumber(166.666, 2)).toBe('166,67');
    expect(formatExcelNumber(90, 4)).toBe('90,0000');
  });
});
