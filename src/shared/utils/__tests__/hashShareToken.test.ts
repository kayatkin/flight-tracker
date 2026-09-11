import { describe, it, expect } from 'vitest';
import { hashShareToken } from '../hashShareToken';

describe('hashShareToken', () => {
  it('returns a stable sha-256 hex digest', async () => {
    const hash = await hashShareToken('view_token_active');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await hashShareToken('view_token_active')).toBe(hash);
    expect(await hashShareToken('other')).not.toBe(hash);
  });
});
