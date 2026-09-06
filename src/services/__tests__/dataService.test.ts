import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadUserData, saveOwnerData } from '../dataService';

const { from } = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { from },
}));

const createQuery = (result: { data?: unknown; error?: unknown }) => {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = () => query;
  query.select = vi.fn(self);
  query.eq = vi.fn(self);
  query.order = vi.fn().mockResolvedValue(result);
  query.upsert = vi.fn().mockResolvedValue({ error: null });
  query.delete = vi.fn(self);
  query.in = vi.fn().mockResolvedValue({ error: null });
  return query;
};

describe('dataService persistence', () => {
  beforeEach(() => {
    from.mockReset();
  });

  it('does not treat a load error as an empty successful snapshot', async () => {
    from.mockReturnValue(createQuery({ data: null, error: { message: 'network' } }));
    const result = await loadUserData('user-1');
    expect(result.ok).toBe(false);
    expect(result.flights).toEqual([]);
  });

  it('does not wipe the database when saving an empty snapshot without known ids', async () => {
    const query = createQuery({ data: [], error: null });
    from.mockReturnValue(query);
    await saveOwnerData('user-1', []);
    expect(query.delete).not.toHaveBeenCalled();
  });

  it('prunes only known missing ids', async () => {
    const query = createQuery({ data: [], error: null });
    from.mockReturnValue(query);

    await saveOwnerData(
      'user-1',
      [{
        id: '11111111-1111-4111-8111-111111111111',
        origin: 'Moscow',
        destination: 'Istanbul',
        type: 'oneWay',
        departureDate: '2026-06-15',
        isDirectThere: true,
        isDirectBack: false,
        airline: 'TK',
        passengers: 1,
        totalPrice: 10000,
        dateFound: '2026-05-01',
      }],
      [],
      [],
      [],
      { knownFlightIds: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'] }
    );

    expect(query.upsert).toHaveBeenCalled();
    expect(query.in).toHaveBeenCalledWith('flight_id', ['22222222-2222-4222-8222-222222222222']);
  });
});
