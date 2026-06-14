import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Flight } from '../../shared/types';
import { GuestUser } from '../../shared/types/shared';

vi.mock('../../shared/utils', () => ({
  getTelegramWebApp: vi.fn(() => undefined),
  getTelegramUser: vi.fn(() => null),
  getDevelopmentUserId: vi.fn(() => 'dev_user'),
  initTelegramWebApp: vi.fn(),
  applyDefaultTheme: vi.fn(),
}));

vi.mock('../../shared/utils/telegramUtils', () => ({
  isInTelegramWebApp: vi.fn(() => false),
  isInTelegramDirectWebApp: vi.fn(() => false),
}));

vi.mock('../../shared/utils/telegramTokens', () => ({
  getTokenFromTelegramStartParam: vi.fn(() => null),
}));

vi.mock('../../shared/utils/id', () => ({
  generateShortId: vi.fn(() => 'shortid'),
}));

vi.mock('../../shared/utils/url', () => ({
  clearTokenFromUrl: vi.fn(),
}));

vi.mock('../../shared/utils/telegramUserType', () => ({
  isRealTelegramUser: vi.fn(() => false),
}));

vi.mock('../../shared/utils/logger', () => ({
  devLog: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../authService', () => ({
  authenticateGuest: vi.fn(),
  authenticateOwner: vi.fn(),
}));

vi.mock('../dataService', () => ({
  loadUserData: vi.fn(),
}));

import { authenticateGuest, authenticateOwner } from '../authService';
import { loadUserData } from '../dataService';
import { initializeApp, resetInitialization } from '../appInitService';

const mockedAuthenticateGuest = vi.mocked(authenticateGuest);
const mockedAuthenticateOwner = vi.mocked(authenticateOwner);
const mockedLoadUserData = vi.mocked(loadUserData);

describe('initializeApp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetInitialization();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.useRealTimers();
    resetInitialization();
  });

  it('initializes guest mode when a share token is present even if a stale processed flag exists', async () => {
    const token = 'abc123token';
    const ownerFlight: Flight = {
      id: '9b50c060-87fb-4d72-9e1c-188f5d6e4259',
      origin: 'Moscow',
      destination: 'Paris',
      type: 'oneWay',
      departureDate: '2026-07-01',
      isDirectThere: true,
      isDirectBack: false,
      airline: 'Test Air',
      passengers: 1,
      totalPrice: 100,
      dateFound: '2026-06-14',
    };
    const guestUser: GuestUser = {
      userId: 'guest_1',
      name: 'Guest',
      isGuest: true,
      sessionToken: token,
      permissions: 'view',
      ownerId: 'owner_1',
      ownerName: 'Owner',
    };

    sessionStorage.setItem('processed_invitation_token', 'true');
    window.history.pushState({}, '', `/?token=${token}`);
    mockedAuthenticateGuest.mockResolvedValue(guestUser);
    mockedLoadUserData.mockResolvedValue({
      flights: [ownerFlight],
      airlines: ['Test Air'],
      originCities: ['Moscow'],
      destinationCities: ['Paris'],
    });

    const resultPromise = initializeApp();
    await vi.advanceTimersByTimeAsync(300);
    const result = await resultPromise;

    expect(mockedAuthenticateGuest).toHaveBeenCalledWith(token);
    expect(mockedAuthenticateOwner).not.toHaveBeenCalled();
    expect(result.appUser.isGuest).toBe(true);
    expect(result.userId).toBe('owner_1');
    expect(result.flights).toEqual([ownerFlight]);
  });
});
