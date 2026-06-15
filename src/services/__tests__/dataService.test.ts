import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadUserData } from '../dataService';

const supabaseMocks = vi.hoisted(() => {
  const order = vi.fn();
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return { from, select, eq, order };
});

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

describe('loadUserData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when Supabase returns a load error', async () => {
    const loadError = new Error('network unavailable');
    supabaseMocks.order.mockResolvedValueOnce({ data: null, error: loadError });

    await expect(loadUserData('owner-1')).rejects.toThrow('network unavailable');
  });

  it('returns empty collections when the user has no flights', async () => {
    supabaseMocks.order.mockResolvedValueOnce({ data: [], error: null });

    await expect(loadUserData('owner-1')).resolves.toEqual({
      flights: [],
      airlines: [],
      originCities: [],
      destinationCities: [],
    });
  });
});
