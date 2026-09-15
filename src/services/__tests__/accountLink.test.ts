import { describe, expect, it } from 'vitest';
import {
  cannotMergeTwoTelegrams,
  pickCanonicalOwnerId,
  summarizeIdentities,
  validateLinkEmailForm,
} from '../accountLink';

describe('accountLink helpers', () => {
  it('validates email, password length and confirmation', () => {
    expect(validateLinkEmailForm({
      email: 'bad',
      password: 'secret1',
    })).toBe('Укажите действующий email');

    expect(validateLinkEmailForm({
      email: 'a@b.c',
      password: '12',
    })).toBe('Пароль не короче 8 символов');

    expect(validateLinkEmailForm({
      email: 'a@b.c',
      password: 'secret1',
    })).toBe('Пароль не короче 8 символов');

    expect(validateLinkEmailForm({
      email: 'a@b.c',
      password: 'secret12',
      confirmPassword: 'secret13',
    })).toBe('Пароли не совпадают');

    expect(validateLinkEmailForm({
      email: '  kai@example.com ',
      password: 'secret12',
      confirmPassword: 'secret12',
    })).toBeNull();
  });

  it('keeps the richer history and the current session on a tie', () => {
    expect(pickCanonicalOwnerId('tg_1', 'uuid-2', 3, 5)).toBe('uuid-2');
    expect(pickCanonicalOwnerId('tg_1', 'uuid-2', 5, 3)).toBe('tg_1');
    expect(pickCanonicalOwnerId('tg_1', 'uuid-2', 2, 2)).toBe('tg_1');
    expect(pickCanonicalOwnerId('tg_1', 'tg_1', 0, 9)).toBe('tg_1');
  });

  it('refuses to merge two different Telegram identities', () => {
    expect(cannotMergeTwoTelegrams('tg_1', 'tg_2')).toBe(true);
    expect(cannotMergeTwoTelegrams('tg_1', 'tg_1')).toBe(false);
    expect(cannotMergeTwoTelegrams('tg_1', null)).toBe(false);
    expect(cannotMergeTwoTelegrams(null, 'tg_2')).toBe(false);
  });

  it('summarizes linked providers', () => {
    expect(summarizeIdentities([])).toEqual({
      hasTelegram: false,
      hasEmail: false,
      email: null,
    });
    expect(summarizeIdentities([
      { provider: 'telegram', provider_user_id: 'tg_1', email: null },
      { provider: 'email', provider_user_id: 'uuid', email: 'kai@example.com' },
    ])).toEqual({
      hasTelegram: true,
      hasEmail: true,
      email: 'kai@example.com',
    });
  });
});
