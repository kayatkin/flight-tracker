import { describe, it, expect, afterEach } from 'vitest';
import { getTelegramUserType } from '../telegramUserType';

describe('getTelegramUserType', () => {
  afterEach(() => {
    delete window.Telegram;
  });

  it('treats a missing SDK as a web browser', () => {
    delete window.Telegram;
    expect(getTelegramUserType()).toBe('web_browser');
  });

  it('does not treat an empty Telegram script as Mini App', () => {
    window.Telegram = {
      WebApp: {
        initData: '',
        platform: 'web',
        ready() {},
        expand() {},
        close() {},
      },
    } as Window['Telegram'];
    expect(getTelegramUserType()).toBe('web_browser');
  });

  it('detects a real Telegram user from launch data', () => {
    window.Telegram = {
      WebApp: {
        initData: 'query_id=1&user=%7B%22id%22%3A1%7D',
        initDataUnsafe: { user: { id: 42, first_name: 'Ada' } },
        platform: 'ios',
        ready() {},
        expand() {},
        close() {},
      },
    } as Window['Telegram'];
    expect(getTelegramUserType()).toBe('real_telegram');
  });
});
