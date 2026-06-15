import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useFlightTracker } from '../useFlightTracker';
import type { Flight } from '../../types/types';
import type { AppUser } from '../../types/shared';
import { initializeApp } from '../../../services/appInitService';
import { saveGuestData, saveOwnerData } from '../../../services/dataService';

vi.mock('../../../services/appInitService', () => ({
  initializeApp: vi.fn(),
  getFallbackInitResult: vi.fn(),
  initGuestMode: vi.fn(),
  clearTokenFromUrl: vi.fn(),
}));

vi.mock('../../../services/dataService', () => ({
  saveOwnerData: vi.fn(),
  saveGuestData: vi.fn(),
}));

const initialFlight: Flight = {
  id: 'flight-1',
  origin: 'MOW',
  destination: 'LED',
  type: 'oneWay',
  departureDate: '2026-06-15',
  isDirectThere: true,
  isDirectBack: false,
  airline: 'Test Air',
  passengers: 1,
  totalPrice: 100,
  dateFound: '2026-06-01',
};

const addedFlight: Flight = {
  ...initialFlight,
  id: 'flight-2',
  destination: 'KZN',
  airline: 'Other Air',
  totalPrice: 200,
};

const ownerUser: AppUser = {
  userId: 'owner-1',
  name: 'Owner',
  isGuest: false,
  isTelegram: false,
};

const initializeAppMock = vi.mocked(initializeApp);
const saveOwnerDataMock = vi.mocked(saveOwnerData);
const saveGuestDataMock = vi.mocked(saveGuestData);

const flushInitialization = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useFlightTracker autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    initializeAppMock.mockResolvedValue({
      userName: 'Owner',
      userId: 'owner-1',
      appUser: ownerUser,
      flights: [initialFlight],
      airlines: ['Test Air'],
      originCities: ['MOW'],
      destinationCities: ['LED'],
    });
    saveOwnerDataMock.mockResolvedValue(undefined);
    saveGuestDataMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not persist the initial loaded snapshot', async () => {
    renderHook(() => useFlightTracker());

    await flushInitialization();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(saveOwnerDataMock).not.toHaveBeenCalled();
    expect(saveGuestDataMock).not.toHaveBeenCalled();
  });

  it('persists after an explicit flight mutation', async () => {
    const { result } = renderHook(() => useFlightTracker());
    await flushInitialization();

    act(() => {
      result.current.handleAddFlight(addedFlight);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(saveOwnerDataMock).toHaveBeenCalledTimes(1);
    expect(saveOwnerDataMock).toHaveBeenCalledWith(
      'owner-1',
      [initialFlight, addedFlight],
      ['Test Air', 'Other Air'],
      ['MOW'],
      ['LED', 'KZN']
    );
  });
});
