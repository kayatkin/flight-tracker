import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildShareUrl, buildTelegramShareUrl, buildWebShareUrl } from '../shareUrls';

describe('shareService', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:5173' },
    });
  });

  it('buildShareUrl is a browser link for both view and edit', () => {
    const view = buildShareUrl('abc123token', 'view');
    const edit = buildShareUrl('abc123token', 'edit');
    expect(view).toContain('token=abc123token');
    expect(view).not.toContain('t.me');
    expect(edit).toBe(view);
  });

  it('buildTelegramShareUrl is an optional Mini App deep link', () => {
    const url = buildTelegramShareUrl('abc123token');
    expect(url).toMatch(/^https:\/\/t\.me\/test_flight_bot/);
    expect(url).toContain('startapp=abc123token');
  });

  it('buildWebShareUrl matches the canonical invite', () => {
    const url = buildWebShareUrl('abc123token');
    expect(url).toBe(buildShareUrl('abc123token'));
    expect(url).not.toContain('t.me');
  });
});
