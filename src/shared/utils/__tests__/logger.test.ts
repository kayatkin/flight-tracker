import { describe, it, expect } from 'vitest';
import { redactSecrets } from '../logger';

describe('redactSecrets', () => {
  it('redacts token query params and share_ values', () => {
    expect(redactSecrets('https://x.test/?token=supersecret')).toBe('https://x.test/?token=[redacted]');
    expect(redactSecrets('start=share_abcdef123456')).toBe('start=share_[redacted]');
  });

  it('redacts token-like object keys', () => {
    expect(redactSecrets({ token: 'abc', flights: 2 })).toEqual({ token: '[redacted]', flights: 2 });
  });
});
