import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
  signInAsDeveloper,
  updatePassword,
} = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  signInAsDeveloper: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock('@services/authService', () => ({
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
  signInAsDeveloper,
  updatePassword,
}));

import AuthScreen from '../AuthScreen';

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs in with email and notifies the app', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn().mockResolvedValue(undefined);
    signInWithEmail.mockResolvedValue({ ok: true });

    render(<AuthScreen onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText('Email'), 'kai@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(signInWithEmail).toHaveBeenCalledWith('kai@example.com', 'secret1');
    expect(onAuthenticated).toHaveBeenCalled();
  });

  it('shows a confirmation hint after sign-up without a session', async () => {
    const user = userEvent.setup();
    signUpWithEmail.mockResolvedValue({ ok: true, needsConfirmation: true });

    render(<AuthScreen onAuthenticated={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: 'Регистрация' }));
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'secret12');
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Проверьте почту');
  });

  it('saves a new password in recovery mode', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn().mockResolvedValue(undefined);
    updatePassword.mockResolvedValue({ ok: true });

    render(<AuthScreen onAuthenticated={onAuthenticated} recoveryMode />);

    await user.type(screen.getByLabelText('Новый пароль'), 'secret12');
    await user.type(screen.getByLabelText('Повторите пароль'), 'secret12');
    await user.click(screen.getByRole('button', { name: 'Сохранить пароль' }));

    expect(updatePassword).toHaveBeenCalledWith('secret12');
    expect(onAuthenticated).toHaveBeenCalled();
  });

  it('rejects mismatched recovery passwords', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();

    render(<AuthScreen onAuthenticated={onAuthenticated} recoveryMode />);

    await user.type(screen.getByLabelText('Новый пароль'), 'secret12');
    await user.type(screen.getByLabelText('Повторите пароль'), 'secret13');
    await user.click(screen.getByRole('button', { name: 'Сохранить пароль' }));

    expect(updatePassword).not.toHaveBeenCalled();
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Пароли не совпадают');
  });

  it('requests a reset email from the forgot-password view', async () => {
    const user = userEvent.setup();
    requestPasswordReset.mockResolvedValue({ ok: true });

    render(<AuthScreen onAuthenticated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Забыли пароль?' }));
    await user.type(screen.getByLabelText('Email'), 'kai@example.com');
    await user.click(screen.getByRole('button', { name: 'Отправить ссылку' }));

    expect(requestPasswordReset).toHaveBeenCalledWith('kai@example.com');
    expect(await screen.findByRole('status')).toHaveTextContent('отправили ссылку');
  });
});
