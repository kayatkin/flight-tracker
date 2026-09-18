import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildInviteLinks, buildInviteMessage } from '../shareCopy';

describe('shareCopy', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:5173' },
    });
  });

  it('uses the web URL for edit and optionally adds Mini App', () => {
    const web = 'http://localhost:5173/flight-tracker/?token=tok';
    const text = buildInviteMessage({
      permissions: 'edit',
      webUrl: web,
      telegramUrl: 'https://t.me/bot?startapp=tok',
    });
    expect(text).toContain(web);
    expect(text).toContain('можно смотреть и менять');
    expect(text).toContain('Telegram и регистрация не нужны');
    expect(text).toContain('https://t.me/bot?startapp=tok');
    expect(text).not.toContain('RunApp');
  });

  it('uses a single web URL for view invites', () => {
    const web = 'http://localhost:5173/flight-tracker/?token=tok';
    const text = buildInviteMessage({
      permissions: 'view',
      webUrl: web,
    });
    expect(text).toContain(web);
    expect(text).toContain('Telegram и регистрация не нужны');
    expect(text).not.toContain('t.me');
  });

  it('copies web plus Mini App when both exist', () => {
    expect(buildInviteLinks({
      webUrl: 'http://localhost:5173/?token=tok',
      telegramUrl: 'https://t.me/bot?startapp=tok',
    })).toBe('http://localhost:5173/?token=tok\nhttps://t.me/bot?startapp=tok');

    expect(buildInviteLinks({
      webUrl: 'http://localhost:5173/?token=tok',
    })).toBe('http://localhost:5173/?token=tok');
  });
});
