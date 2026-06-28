import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFlightData, loadUserData, saveOwnerData } from '../dataService';
import { Flight } from '../../shared/types';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: fromMock,
  },
}));

const flight: Flight = {
  id: '1f0a4010-6db8-46ab-9ffc-a106dc72ac00',
  origin: 'TBS',
  destination: 'AMS',
  type: 'oneWay',
  departureDate: '2026-07-01',
  isDirectThere: true,
  isDirectBack: false,
  airline: 'Test Air',
  passengers: 1,
  totalPrice: 100,
  dateFound: '2026-06-28',
};

describe('dataService', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('throws load errors instead of returning an empty snapshot', async () => {
    const loadError = new Error('RLS denied');
    const order = vi.fn().mockResolvedValue({ data: null, error: loadError });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    fromMock.mockReturnValue({ select });

    await expect(loadUserData('user-1')).rejects.toBe(loadError);
  });

  it('does not clear all rows for an empty autosave snapshot', async () => {
    await saveOwnerData('user-1', [], [], [], []);

    expect(fromMock).not.toHaveBeenCalled();
  });

  it('upserts the current snapshot without pruning other rows', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upsert });

    await saveOwnerData('user-1', [flight], [], [], []);

    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('user_flights');
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid flight ids before saving', async () => {
    await expect(
      saveOwnerData('user-1', [{ ...flight, id: 'legacy-id' }], [], [], [])
    ).rejects.toThrow(/invalid UUID/);

    expect(fromMock).not.toHaveBeenCalled();
  });

  it('deletes only the requested flight row', async () => {
    const eqFlightId = vi.fn().mockResolvedValue({ error: null });
    const eqUserId = vi.fn(() => ({ eq: eqFlightId }));
    const deleteMock = vi.fn(() => ({ eq: eqUserId }));
    fromMock.mockReturnValue({ delete: deleteMock });

    await deleteFlightData('user-1', flight.id);

    expect(fromMock).toHaveBeenCalledWith('user_flights');
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(eqUserId).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eqFlightId).toHaveBeenCalledWith('flight_id', flight.id);
  });
});
