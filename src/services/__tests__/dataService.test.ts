import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
  },
}));

const mockFlightLoad = (result: unknown) => {
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  mocks.from.mockReturnValue({ select });
  return { select, eq, order };
};

describe('dataService', () => {
  beforeEach(() => {
    mocks.from.mockReset();
  });

  it('throws when flight loading fails instead of returning an empty dataset', async () => {
    const { loadUserData } = await import('../dataService');
    const loadError = new Error('network unavailable');
    const query = mockFlightLoad({ data: null, error: loadError });

    await expect(loadUserData('tg_123')).rejects.toThrow(loadError);

    expect(mocks.from).toHaveBeenCalledWith('user_flights');
    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'tg_123');
    expect(query.order).toHaveBeenCalledWith('departure_date', { ascending: true });
  });

  it('still returns an empty dataset when the load succeeds with no rows', async () => {
    const { loadUserData } = await import('../dataService');
    mockFlightLoad({ data: [], error: null });

    await expect(loadUserData('tg_123')).resolves.toEqual({
      flights: [],
      airlines: [],
      originCities: [],
      destinationCities: [],
    });
  });
});
