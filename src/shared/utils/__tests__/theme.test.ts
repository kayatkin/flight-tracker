import { describe, it, expect } from 'vitest';
import { hexToRgb } from '../theme';

describe('hexToRgb', () => {
  it('converts hex colors to rgb triplets', () => {
    expect(hexToRgb('#2481cc')).toBe('36, 129, 204');
    expect(hexToRgb('ffffff')).toBe('255, 255, 255');
  });

  it('falls back for invalid values', () => {
    expect(hexToRgb('not-a-color')).toBe('0, 136, 204');
  });
});
