import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryBuilder, mockSupabase } = vi.hoisted(() => {
  const queryBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  return {
    queryBuilder,
    mockSupabase: {
      from: vi.fn(() => queryBuilder),
    },
  };
});

vi.mock('../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

import { loadUserData } from '../dataService';

describe('loadUserData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.eq.mockReturnValue(queryBuilder);
  });

  it('returns an empty dataset when the user has no flights', async () => {
    queryBuilder.order.mockResolvedValue({ data: [], error: null });

    await expect(loadUserData('owner-1')).resolves.toEqual({
      flights: [],
      airlines: [],
      originCities: [],
      destinationCities: [],
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('user_flights');
    expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'owner-1');
  });

  it('rejects when Supabase fails to load flights', async () => {
    const loadError = new Error('database unavailable');
    queryBuilder.order.mockResolvedValue({ data: null, error: loadError });

    await expect(loadUserData('owner-1')).rejects.toBe(loadError);
  });
});
