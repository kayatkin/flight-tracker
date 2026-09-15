import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyOtp, setSession, onAuthStateChange } = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  setSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('@shared/lib', () => ({
  supabase: {
    auth: {
      verifyOtp,
      setSession,
      onAuthStateChange,
    },
  },
}));

import {
  clearPasswordRecovery,
  consumeAuthCallback,
  isPasswordRecoveryPending,
  markPasswordRecovery,
  resetPasswordRecoveryForTests,
} from '../authRecovery';

describe('authRecovery', () => {
  beforeEach(() => {
    resetPasswordRecoveryForTests();
    vi.clearAllMocks();
  });

  it('remembers a recovery flag in sessionStorage', () => {
    expect(isPasswordRecoveryPending()).toBe(false);
    markPasswordRecovery();
    expect(isPasswordRecoveryPending()).toBe(true);
    expect(sessionStorage.getItem('flight-tracker:password-recovery')).toBe('1');
    clearPasswordRecovery();
    expect(isPasswordRecoveryPending()).toBe(false);
  });

  it('verifies a token_hash recovery link', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    await consumeAuthCallback(
      'https://kayatkin.github.io/flight-tracker/?token_hash=abc&type=recovery'
    );
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'recovery' });
    expect(isPasswordRecoveryPending()).toBe(true);
  });

  it('applies implicit recovery tokens when PKCE would reject the hash', async () => {
    setSession.mockResolvedValue({ error: null });
    await consumeAuthCallback(
      'https://kayatkin.github.io/flight-tracker/#access_token=tok&refresh_token=ref&type=recovery'
    );
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'tok',
      refresh_token: 'ref',
    });
    expect(isPasswordRecoveryPending()).toBe(true);
  });

  it('does not mark recovery when token verification fails', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'otp_expired' } });
    await consumeAuthCallback(
      'https://kayatkin.github.io/flight-tracker/?token_hash=abc&type=recovery'
    );
    expect(isPasswordRecoveryPending()).toBe(false);
  });

  it('does not mark recovery when type=recovery has no tokens', async () => {
    await consumeAuthCallback(
      'https://kayatkin.github.io/flight-tracker/?type=recovery'
    );
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
    expect(isPasswordRecoveryPending()).toBe(false);
  });
});
