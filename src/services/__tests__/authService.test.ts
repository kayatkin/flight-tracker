import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  setSupabaseAccessToken: vi.fn(),
}));

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
  setSupabaseAccessToken: mocks.setSupabaseAccessToken,
}));

vi.mock('@shared/config/env', () => ({
  env: {
    isDev: true,
  },
}));

vi.mock('@shared/utils/telegram', () => ({
  getDevelopmentUserId: () => 'dev_user',
}));

vi.mock('@shared/utils/telegramUserType', () => ({
  isRealTelegramUser: () => false,
}));

describe('authService', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.setSupabaseAccessToken.mockReset();
  });

  it('applies Edge Function owner JWT as the Supabase request token', async () => {
    const { authenticateTelegram } = await import('../authService');
    mocks.invoke.mockResolvedValueOnce({
      data: {
        access_token: 'owner-jwt',
        refresh_token: 'not-a-gotrue-refresh-token',
        userId: 'tg_123',
        name: 'Alice',
      },
      error: null,
    });

    await expect(authenticateTelegram('telegram-init-data')).resolves.toEqual({
      userId: 'tg_123',
      userName: 'Alice',
    });

    expect(mocks.invoke).toHaveBeenCalledWith('auth-telegram', {
      body: { initData: 'telegram-init-data' },
    });
    expect(mocks.setSupabaseAccessToken).toHaveBeenCalledWith('owner-jwt');
  });

  it('applies guest JWT returned for a share token', async () => {
    const { authenticateGuest } = await import('../authService');
    const guestUser = {
      userId: 'guest_1',
      name: 'Guest',
      isGuest: true,
      sessionToken: 'share-token',
      permissions: 'view',
      ownerId: 'tg_123',
      ownerName: 'Alice',
    };
    mocks.invoke.mockResolvedValueOnce({
      data: {
        access_token: 'guest-jwt',
        refresh_token: 'not-a-gotrue-refresh-token',
        guestUser,
      },
      error: null,
    });

    await expect(authenticateGuest('share-token')).resolves.toEqual(guestUser);

    expect(mocks.invoke).toHaveBeenCalledWith('auth-guest', {
      body: { token: 'share-token', initData: '' },
    });
    expect(mocks.setSupabaseAccessToken).toHaveBeenCalledWith('guest-jwt');
  });

  it('clears the app JWT on sign out without using Supabase Auth sessions', async () => {
    const { signOutAuth } = await import('../authService');

    await signOutAuth();

    expect(mocks.setSupabaseAccessToken).toHaveBeenCalledWith(null);
  });
});
