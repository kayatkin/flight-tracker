import { generateShareToken, generateUUID, isValidUUID } from '../id';

describe('id utilities', () => {
  it('generateUUID returns valid v4 UUID', () => {
    const id = generateUUID();
    expect(isValidUUID(id)).toBe(true);
  });

  it('generateShareToken returns unique 32-char hex strings', () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).toHaveLength(32);
    expect(b).toHaveLength(32);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]+$/);
  });
});
