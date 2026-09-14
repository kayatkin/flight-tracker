import { describe, expect, it } from 'vitest';
import {
  AuthRequiredError,
  authRedirectUrl,
  decodeJwtPayload,
  isAuthRequiredError,
  isRecoveryCallback,
  mapAuthError,
  ownerFromCustomAccessToken,
  ownerFromGoTrueUser,
  ownerFromSession,
  parseAuthCallbackParams,
  validateEmailAuthForm,
} from '../emailAuth';

const jwtWith = (claims: Record<string, unknown>): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(claims));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const payload = btoa(binary).replace(/=+$/, '');
  return `eyJhbGciOiJub25l.${payload}.sig`;
};

describe('emailAuth helpers', () => {
  it('detects AuthRequiredError by instance and by name', () => {
    expect(isAuthRequiredError(new AuthRequiredError())).toBe(true);
    const named = new Error('Authentication required');
    named.name = 'AuthRequiredError';
    expect(isAuthRequiredError(named)).toBe(true);
    expect(isAuthRequiredError(new Error('nope'))).toBe(false);
    expect(isAuthRequiredError('Authentication required')).toBe(false);
  });

  it('builds a redirect URL from the current location', () => {
    expect(authRedirectUrl()).toBe(`${window.location.origin}${window.location.pathname}`);
  });

  it('picks a display name from GoTrue metadata, then email', () => {
    expect(ownerFromGoTrueUser({
      id: 'u1',
      email: 'ann@example.com',
      user_metadata: { name: ' Анна ' },
    })).toEqual({ userId: 'u1', userName: 'Анна' });

    expect(ownerFromGoTrueUser({
      id: 'u2',
      email: 'pilot@example.com',
      user_metadata: {},
    })).toEqual({ userId: 'u2', userName: 'pilot' });

    expect(ownerFromGoTrueUser({ id: 'u3' })).toEqual({
      userId: 'u3',
      userName: 'Владелец',
    });
  });

  it('decodes owner custom JWTs and ignores guests', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(ownerFromCustomAccessToken(jwtWith({
      app_role: 'owner',
      user_id: 'tg_1',
      name: 'Кай',
    }))).toEqual({ userId: 'tg_1', userName: 'Кай' });

    expect(ownerFromCustomAccessToken(jwtWith({
      app_role: 'owner',
      sub: 'dev-1',
    }))).toEqual({ userId: 'dev-1', userName: 'Владелец' });

    expect(ownerFromCustomAccessToken(jwtWith({
      app_role: 'guest',
      user_id: 'owner_a',
    }))).toBeNull();

    expect(ownerFromCustomAccessToken(jwtWith({
      role: 'authenticated',
      sub: 'uuid',
    }))).toBeNull();
  });

  it('prefers canonical user_id from a hooked GoTrue access token', () => {
    expect(ownerFromSession({
      access_token: jwtWith({
        app_role: 'owner',
        user_id: 'tg_1',
        name: 'Кай',
      }),
      user: { id: 'uuid-from-gotrue', email: 'kai@example.com' },
    })).toEqual({ userId: 'tg_1', userName: 'Кай' });

    expect(ownerFromSession({
      access_token: 'not-a-jwt',
      user: { id: 'uuid-2', email: 'ann@example.com', user_metadata: {} },
    })).toEqual({ userId: 'uuid-2', userName: 'ann' });
  });

  it('maps GoTrue error strings to Russian copy', () => {
    expect(mapAuthError(undefined)).toBe('Не удалось войти. Попробуйте ещё раз.');
    expect(mapAuthError('Invalid login credentials')).toBe('Неверный email или пароль');
    expect(mapAuthError('Email not confirmed')).toBe('Подтвердите email по ссылке из письма');
    expect(mapAuthError('User already registered')).toBe(
      'Этот email уже зарегистрирован. Войдите или сбросьте пароль.'
    );
    expect(mapAuthError('Password should be at least 6 characters')).toBe(
      'Пароль слишком короткий. Минимум 6 символов.'
    );
    expect(mapAuthError('Too many requests')).toBe('Слишком много попыток. Подождите минуту.');
    expect(mapAuthError('User not found')).toBe('Аккаунт с таким email не найден');
    expect(mapAuthError('invalid pkce code verifier')).toBe(
      'Откройте ссылку из письма в том же браузере, где нажали «Забыли пароль».'
    );
    expect(mapAuthError('otp_expired')).toBe('Ссылка устарела. Запросите сброс пароля ещё раз.');
    expect(mapAuthError('something else')).toBe('Не удалось войти. Попробуйте ещё раз.');
  });

  it('parses recovery callbacks from query and hash', () => {
    expect(parseAuthCallbackParams(
      'https://kayatkin.github.io/flight-tracker/?token_hash=abc&type=recovery'
    )).toEqual({
      type: 'recovery',
      token_hash: 'abc',
      access_token: undefined,
      refresh_token: undefined,
      code: undefined,
      error: undefined,
      error_description: undefined,
    });
    expect(isRecoveryCallback(parseAuthCallbackParams(
      'https://example.test/flight-tracker/#access_token=tok&refresh_token=ref&type=recovery'
    ))).toBe(true);
    expect(isRecoveryCallback(parseAuthCallbackParams(
      'https://example.test/flight-tracker/?code=pkce'
    ))).toBe(false);
  });

  it('validates email/password forms', () => {
    expect(validateEmailAuthForm({
      email: 'bad',
      password: 'secret1',
      mode: 'login',
    })).toBe('Укажите действующий email');

    expect(validateEmailAuthForm({
      email: 'a@b.c',
      password: '12',
      mode: 'register',
    })).toBe('Пароль не короче 6 символов');

    expect(validateEmailAuthForm({
      email: 'a@b.c',
      password: '',
      mode: 'forgot',
    })).toBeNull();

    expect(validateEmailAuthForm({
      email: 'a@b.c',
      password: 'secret1',
      mode: 'login',
    })).toBeNull();
  });
});
