import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Flight } from '../../shared/types';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  firstEq: vi.fn(),
  secondEq: vi.fn(),
  devLog: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
  },
}));

vi.mock('../../shared/utils/logger', () => ({
  devLog: mocks.devLog,
  logError: mocks.logError,
}));

import { deleteFlightData, saveOwnerData } from '../dataService';

const flight: Flight = {
  id: '11111111-1111-4111-8111-111111111111',
  origin: 'MOW',
  destination: 'LED',
  type: 'oneWay',
  departureDate: '2026-07-01',
  isDirectThere: true,
  isDirectBack: true,
  airline: 'Test Air',
  passengers: 1,
  totalPrice: 100,
  dateFound: '2026-06-26',
};

describe('dataService persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.upsert.mockResolvedValue({ error: null });
    mocks.secondEq.mockResolvedValue({ error: null });
    mocks.firstEq.mockReturnValue({ eq: mocks.secondEq });
    mocks.delete.mockReturnValue({ eq: mocks.firstEq });
    mocks.from.mockReturnValue({
      upsert: mocks.upsert,
      delete: mocks.delete,
    });
  });

  it('does not prune rows that are absent from an autosave snapshot', async () => {
    await saveOwnerData('user-1', [flight], [], [], []);

    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('does not clear all rows on an empty autosave snapshot', async () => {
    await saveOwnerData('user-1', [], [], [], []);

    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('deletes only the targeted flight when deletion is explicit', async () => {
    await deleteFlightData('user-1', flight.id);

    expect(mocks.delete).toHaveBeenCalledTimes(1);
    expect(mocks.firstEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mocks.secondEq).toHaveBeenCalledWith('flight_id', flight.id);
  });
});
