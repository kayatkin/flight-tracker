import { describe, expect, it, vi, beforeEach } from 'vitest';

const orderMock = vi.fn();
const eqMock = vi.fn(() => ({ order: orderMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('dataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when loading flights fails instead of returning empty data', async () => {
    const loadError = new Error('RLS denied');
    orderMock.mockResolvedValue({ data: null, error: loadError });

    const { loadUserData } = await import('../dataService');

    await expect(loadUserData('tg_123')).rejects.toBe(loadError);
    expect(fromMock).toHaveBeenCalledWith('user_flights');
  });
});
