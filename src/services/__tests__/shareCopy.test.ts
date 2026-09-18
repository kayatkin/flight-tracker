import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildInviteLinks, buildInviteMessage } from '../shareCopy';

describe('shareCopy', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:5173' },
    });
  });

  it('puts both Telegram and web URLs into an edit invite', () => {
    const text = buildInviteMessage({
      permissions: 'edit',
      shareUrl: 'https://t.me/bot?startapp=tok',
      webUrl: 'http://localhost:5173/flight-tracker/?token=tok',
    });
    expect(text).toContain('https://t.me/bot?startapp=tok');
    expect(text).toContain('http://localhost:5173/flight-tracker/?token=tok');
    expect(text).toContain('Без Telegram');
    expect(text).not.toContain('RunApp');
  });

  it('uses a single web URL for view invites', () => {
    const web = 'http://localhost:5173/flight-tracker/?token=tok';
    const text = buildInviteMessage({
      permissions: 'view',
      shareUrl: web,
      webUrl: web,
    });
    expect(text).toContain(web);
    expect(text).toContain('Telegram не нужен');
    expect(text).not.toContain('t.me');
  });

  it('copies both links for edit and one for view', () => {
    expect(buildInviteLinks({
      permissions: 'edit',
      shareUrl: 'https://t.me/bot?startapp=tok',
      webUrl: 'http://localhost:5173/?token=tok',
    })).toBe('https://t.me/bot?startapp=tok\nhttp://localhost:5173/?token=tok');

    expect(buildInviteLinks({
      permissions: 'view',
      shareUrl: 'http://localhost:5173/?token=tok',
      webUrl: 'http://localhost:5173/?token=tok',
    })).toBe('http://localhost:5173/?token=tok');
  });
});
