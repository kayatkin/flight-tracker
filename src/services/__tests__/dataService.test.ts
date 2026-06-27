import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Flight } from '../../shared/types';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  deleteEq: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
  },
}));

vi.mock('../../shared/utils/logger', () => ({
  devLog: vi.fn(),
  logError: vi.fn(),
}));

import { deleteFlightData, saveOwnerData } from '../dataService';

const flight: Flight = {
  id: '11111111-1111-4111-8111-111111111111',
  origin: 'AMS',
  destination: 'BER',
  type: 'oneWay',
  departureDate: '2026-07-01',
  isDirectThere: true,
  isDirectBack: false,
  airline: 'Test Air',
  passengers: 1,
  totalPrice: 100,
  dateFound: '2026-06-27',
};

const mockDeleteBuilder = () => {
  const builder = {
    eq: mocks.deleteEq,
    then: (resolve: (value: { error: null }) => void, reject?: (reason: unknown) => void) =>
      Promise.resolve({ error: null }).then(resolve, reject),
  };

  mocks.deleteEq.mockReturnValue(builder);
  return builder;
};

describe('dataService persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.delete.mockImplementation(() => mockDeleteBuilder());
    mocks.from.mockReturnValue({
      upsert: mocks.upsert,
      delete: mocks.delete,
    });
  });

  it('upserts flights without pruning rows missing from the local snapshot', async () => {
    await saveOwnerData('user-1', [flight], [], [], []);

    expect(mocks.from).toHaveBeenCalledWith('user_flights');
    expect(mocks.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({
        flight_id: flight.id,
        user_id: 'user-1',
        origin: 'AMS',
        destination: 'BER',
      })],
      { onConflict: 'flight_id' }
    );
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('does not clear all persisted rows for an empty autosave snapshot', async () => {
    await saveOwnerData('user-1', [], [], [], []);

    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('deletes only the selected flight for the selected owner', async () => {
    await deleteFlightData('user-1', flight.id);

    expect(mocks.delete).toHaveBeenCalledTimes(1);
    expect(mocks.deleteEq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1');
    expect(mocks.deleteEq).toHaveBeenNthCalledWith(2, 'flight_id', flight.id);
  });
});
