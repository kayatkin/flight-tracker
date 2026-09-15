import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadIdentities, linkEmailAccount, refreshOwnerAfterLink, toast } = vi.hoisted(() => ({
  loadIdentities: vi.fn(),
  linkEmailAccount: vi.fn(),
  refreshOwnerAfterLink: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@services/accountService', async () => {
  const actual = await vi.importActual<typeof import('@services/accountService')>(
    '@services/accountService'
  );
  return {
    ...actual,
    loadIdentities,
    linkEmailAccount,
    refreshOwnerAfterLink,
  };
});

vi.mock('@shared/ui/Toast', () => ({ toast }));

import AccountModal from '../AccountModal';

describe('AccountModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshOwnerAfterLink.mockResolvedValue(undefined);
  });

  it('shows the link form for a Telegram owner without email', async () => {
    loadIdentities.mockResolvedValue([
      { provider: 'telegram', provider_user_id: 'tg_1', email: null },
    ]);

    render(
      <AccountModal isTelegram onClose={vi.fn()} onLinked={vi.fn()} />
    );

    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Привязать email' })).toBeInTheDocument();
    expect(screen.getByText('привязан')).toBeInTheDocument();
    expect(screen.getByText('не привязан')).toBeInTheDocument();
  });

  it('rejects mismatched passwords without calling the API', async () => {
    const user = userEvent.setup();
    loadIdentities.mockResolvedValue([
      { provider: 'telegram', provider_user_id: 'tg_1', email: null },
    ]);
    linkEmailAccount.mockResolvedValue({ ok: false, error: 'Пароли не совпадают' });

    render(
      <AccountModal isTelegram onClose={vi.fn()} onLinked={vi.fn()} />
    );

    await user.type(await screen.findByLabelText('Email'), 'kai@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'secret12');
    await user.type(screen.getByLabelText('Повторите пароль'), 'secret13');
    await user.click(screen.getByRole('button', { name: 'Привязать email' }));

    expect(linkEmailAccount).toHaveBeenCalledWith('kai@example.com', 'secret12', 'secret13');
    expect(await screen.findByRole('alert')).toHaveTextContent('Пароли не совпадают');
    expect(refreshOwnerAfterLink).not.toHaveBeenCalled();
  });

  it('links email then refreshes the owner session', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onLinked = vi.fn().mockResolvedValue(undefined);
    loadIdentities.mockResolvedValue([
      { provider: 'telegram', provider_user_id: 'tg_1', email: null },
    ]);
    linkEmailAccount.mockResolvedValue({
      ok: true,
      needsConfirmation: true,
      identities: [
        { provider: 'telegram', provider_user_id: 'tg_1', email: null },
        { provider: 'email', provider_user_id: 'uuid', email: 'kai@example.com' },
      ],
    });

    render(
      <AccountModal isTelegram onClose={onClose} onLinked={onLinked} />
    );

    await user.type(await screen.findByLabelText('Email'), 'kai@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'secret12');
    await user.type(screen.getByLabelText('Повторите пароль'), 'secret12');
    await user.click(screen.getByRole('button', { name: 'Привязать email' }));

    expect(linkEmailAccount).toHaveBeenCalledWith('kai@example.com', 'secret12', 'secret12');
    expect(refreshOwnerAfterLink).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(onLinked).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining('Подтвердите ящик'),
      'success'
    );
  });

  it('shows a shared-account status when both providers are linked', async () => {
    loadIdentities.mockResolvedValue([
      { provider: 'telegram', provider_user_id: 'tg_1', email: null },
      { provider: 'email', provider_user_id: 'uuid', email: 'kai@example.com' },
    ]);

    render(
      <AccountModal isTelegram onClose={vi.fn()} onLinked={vi.fn()} />
    );

    expect(await screen.findByText('kai@example.com')).toBeInTheDocument();
    expect(screen.getByText(/история общая/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Привязать email' })).not.toBeInTheDocument();
  });

  it('tells an email-only owner to finish linking in Telegram', async () => {
    loadIdentities.mockResolvedValue([
      { provider: 'email', provider_user_id: 'uuid', email: 'kai@example.com' },
    ]);

    render(
      <AccountModal isTelegram={false} onClose={vi.fn()} onLinked={vi.fn()} />
    );

    expect(await screen.findByText('kai@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Откройте Mini App в Telegram/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Привязать email' })).not.toBeInTheDocument();
  });
});
