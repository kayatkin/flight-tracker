import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildShareUrl } from '../shareUrls';

describe('shareService', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:5173' },
    });
  });

  it('buildShareUrl returns Telegram deep link for edit permission', () => {
    const url = buildShareUrl('abc123token', 'edit');
    expect(url).toMatch(/^https:\/\/t\.me\//);
    expect(url).toContain('startapp=abc123token');
  });

  it('buildShareUrl returns web URL for view permission', () => {
    const url = buildShareUrl('abc123token', 'view');
    expect(url).toContain('token=abc123token');
  });
});
