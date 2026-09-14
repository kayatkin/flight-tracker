import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke, from, refreshSession } = vi.hoisted(() => ({
  invoke: vi.fn(),
  from: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock('@shared/lib', () => ({
  supabase: {
    functions: { invoke },
    from,
    auth: { refreshSession },
  },
}));

vi.mock('@shared/utils/telegramUserType', () => ({
  isRealTelegramUser: () => false,
}));

vi.mock('../authService', () => ({
  authenticateTelegram: vi.fn(),
}));

import { linkEmailAccount, loadIdentities, refreshOwnerAfterLink } from '../accountService';

describe('accountService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshSession.mockResolvedValue({ error: null });
  });

  it('loads own identities and skips unknown providers', async () => {
    from.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          { provider: 'email', provider_user_id: 'uuid-1', email: 'kai@example.com' },
          { provider: 'sms', provider_user_id: 'x', email: null },
        ],
        error: null,
      }),
    });

    await expect(loadIdentities()).resolves.toEqual([
      { provider: 'email', provider_user_id: 'uuid-1', email: 'kai@example.com' },
    ]);
    expect(from).toHaveBeenCalledWith('user_identities');
  });

  it('returns an empty list when the table is unavailable', async () => {
    from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: null, error: { message: 'nope' } }),
    });
    await expect(loadIdentities()).resolves.toEqual([]);
  });

  it('validates before invoking link-email', async () => {
    await expect(linkEmailAccount('bad', 'secret1')).resolves.toEqual({
      ok: false,
      error: 'Укажите действующий email',
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('invokes link-email and returns the function body', async () => {
    invoke.mockResolvedValue({
      data: { ok: true, canonicalUserId: 'tg_1', merged: false, needsConfirmation: true },
      error: null,
    });

    await expect(linkEmailAccount('kai@example.com', 'secret1', 'secret1')).resolves.toEqual({
      ok: true,
      canonicalUserId: 'tg_1',
      merged: false,
      needsConfirmation: true,
    });
    expect(invoke).toHaveBeenCalledWith('link-email', {
      body: { email: 'kai@example.com', password: 'secret1' },
    });
  });

  it('maps invoke failures and business errors', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(linkEmailAccount('kai@example.com', 'secret1')).resolves.toEqual({
      ok: false,
      error: 'Не удалось связать аккаунт. Попробуйте ещё раз.',
    });

    invoke.mockResolvedValueOnce({
      data: { ok: false, error: 'Неверный пароль для этого email' },
      error: null,
    });
    await expect(linkEmailAccount('kai@example.com', 'secret1')).resolves.toEqual({
      ok: false,
      error: 'Неверный пароль для этого email',
    });
  });

  it('refreshes a GoTrue session after linking in the browser', async () => {
    await refreshOwnerAfterLink();
    expect(refreshSession).toHaveBeenCalled();
  });
});
