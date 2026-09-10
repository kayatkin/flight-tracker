import { describe, expect, it } from 'vitest';
import { normalizeToastOptions } from '../toastBus';

describe('normalizeToastOptions', () => {
  it('keeps the old toast(message, variant) calls', () => {
    expect(normalizeToastOptions('error')).toEqual({ variant: 'error' });
  });

  it('passes through an action toast', () => {
    const onClick = () => undefined;
    expect(normalizeToastOptions({
      variant: 'info',
      durationMs: 8000,
      action: { label: 'Вернуть', onClick },
    })).toEqual({
      variant: 'info',
      durationMs: 8000,
      action: { label: 'Вернуть', onClick },
    });
  });
});
