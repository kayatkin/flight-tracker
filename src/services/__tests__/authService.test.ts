import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getSession,
  setSession,
  signInWithPassword,
  signUp,
  resetPasswordForEmail,
  updateUser,
  signOut,
  startAutoRefresh,
  stopAutoRefresh,
  invoke,
  from,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  startAutoRefresh: vi.fn(),
  stopAutoRefresh: vi.fn(),
  invoke: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@shared/lib', () => ({
  supabase: {
    auth: {
      getSession,
      setSession,
      signInWithPassword,
      signUp,
      resetPasswordForEmail,
      updateUser,
      signOut,
      startAutoRefresh,
      stopAutoRefresh,
    },
    functions: { invoke },
    from,
  },
}));

vi.mock('@shared/config/env', () => ({
  env: { isDev: true, isProd: false },
}));

import {
  authenticateOwner,
  requestPasswordReset,
  restoreGoTrueOwner,
  signInWithEmail,
  signUpWithEmail,
  updatePassword,
} from '../authService';

const jwtWith = (claims: Record<string, unknown>): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(claims));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const payload = btoa(binary).replace(/=+$/, '');
  return `eyJhbGciOiJub25l.${payload}.sig`;
};

describe('authService email sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });
    setSession.mockResolvedValue({ error: null });
  });

  it('restores a real GoTrue session and starts refresh', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'access',
          refresh_token: 'refresh',
          user: { id: 'uuid-1', email: 'ann@example.com', user_metadata: { name: 'Анна' } },
        },
      },
      error: null,
    });

    await expect(restoreGoTrueOwner()).resolves.toEqual({
      userId: 'uuid-1',
      userName: 'Анна',
    });
    expect(startAutoRefresh).toHaveBeenCalled();
  });

  it('restores the canonical user_id from a hooked GoTrue JWT', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: jwtWith({ app_role: 'owner', user_id: 'tg_1', name: 'Кай' }),
          refresh_token: 'refresh',
          user: { id: 'uuid-linked', email: 'kai@example.com' },
        },
      },
      error: null,
    });

    await expect(restoreGoTrueOwner()).resolves.toEqual({
      userId: 'tg_1',
      userName: 'Кай',
    });
    expect(startAutoRefresh).toHaveBeenCalled();
  });

  it('restores a custom owner JWT used by auth-dev / Telegram', async () => {
    const access = jwtWith({ app_role: 'owner', user_id: 'dev_local', name: 'Разработчик' });
    getSession.mockResolvedValue({
      data: { session: { access_token: access, refresh_token: access, user: { id: 'dev_local' } } },
      error: null,
    });

    await expect(restoreGoTrueOwner()).resolves.toEqual({
      userId: 'dev_local',
      userName: 'Разработчик',
    });
    expect(stopAutoRefresh).toHaveBeenCalled();
  });

  it('does not treat a leftover guest JWT as an owner session', async () => {
    const access = jwtWith({ app_role: 'guest', user_id: 'owner_a', permissions: 'view' });
    getSession.mockResolvedValue({
      data: { session: { access_token: access, refresh_token: access, user: { id: 'guest' } } },
      error: null,
    });

    await expect(restoreGoTrueOwner()).resolves.toBeNull();
  });

  it('signs in with email and upserts public.users', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: 'uuid-2', email: 'kai@example.com', user_metadata: {} } },
      error: null,
    });

    await expect(signInWithEmail('kai@example.com', 'secret1')).resolves.toEqual({ ok: true });
    expect(startAutoRefresh).toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith('users');
  });

  it('returns a validation error without calling GoTrue', async () => {
    await expect(signInWithEmail('bad', 'secret1')).resolves.toEqual({
      ok: false,
      error: 'Укажите действующий email',
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('asks the user to confirm email when sign-up has no session', async () => {
    signUp.mockResolvedValue({ data: { session: null, user: { id: 'u' } }, error: null });
    await expect(signUpWithEmail('new@example.com', 'secret1')).resolves.toEqual({
      ok: true,
      needsConfirmation: true,
    });
  });

  it('maps invalid credentials', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });
    await expect(signInWithEmail('kai@example.com', 'secret1')).resolves.toEqual({
      ok: false,
      error: 'Неверный email или пароль',
    });
  });

  it('sends a password reset and updates a new password', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    updateUser.mockResolvedValue({ error: null });
    await expect(requestPasswordReset('kai@example.com')).resolves.toEqual({ ok: true });
    await expect(updatePassword('secret1')).resolves.toEqual({ ok: true });
    await expect(updatePassword('123')).resolves.toEqual({
      ok: false,
      error: 'Пароль не короче 6 символов',
    });
  });

  it('drops a leftover custom guest session when no owner is found', async () => {
    const access = jwtWith({ app_role: 'guest', user_id: 'owner_a' });
    getSession.mockResolvedValue({
      data: { session: { access_token: access, refresh_token: access, user: { id: 'g' } } },
      error: null,
    });
    signOut.mockResolvedValue({ error: null });

    await expect(authenticateOwner()).resolves.toBeNull();
    expect(signOut).toHaveBeenCalled();
  });
});
