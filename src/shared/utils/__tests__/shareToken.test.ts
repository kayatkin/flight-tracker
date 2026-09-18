import { describe, it, expect } from 'vitest';
import { extractShareToken, looksLikeTelegramShareUrl } from '../shareToken';

describe('extractShareToken', () => {
  it('returns a raw token', () => {
    expect(extractShareToken('abcdefghijklmnopqrstuv')).toBe('abcdefghijklmnopqrstuv');
  });

  it('extracts web ?token=', () => {
    expect(extractShareToken('https://example.com/app/?token=abc123token9')).toBe('abc123token9');
  });

  it('extracts Telegram startapp links', () => {
    expect(extractShareToken('https://t.me/my_bot?startapp=abc123token9')).toBe('abc123token9');
  });

  it('extracts /start share_ deep links', () => {
    expect(extractShareToken('https://t.me/my_bot?start=share_abc123token9')).toBe('abc123token9');
  });

  it('extracts tgWebAppStartParam', () => {
    expect(extractShareToken('https://example.com/?tgWebAppStartParam=abc123token9')).toBe('abc123token9');
  });

  it('returns null for empty input', () => {
    expect(extractShareToken('   ')).toBeNull();
  });

  it('does not treat a random pasted URL as a token', () => {
    expect(extractShareToken('https://example.com/flight-tracker/')).toBeNull();
  });
});

describe('looksLikeTelegramShareUrl', () => {
  it('detects startapp Mini App links', () => {
    expect(looksLikeTelegramShareUrl('https://t.me/my_bot?startapp=abc123token9')).toBe(true);
  });

  it('detects legacy /start share_ links', () => {
    expect(looksLikeTelegramShareUrl('https://t.me/my_bot?start=share_abc123token9')).toBe(true);
  });

  it('ignores web view links and raw tokens', () => {
    expect(looksLikeTelegramShareUrl('https://kayatkin.github.io/flight-tracker/?token=abc123token9')).toBe(false);
    expect(looksLikeTelegramShareUrl('abcdefghijklmnopqrstuv')).toBe(false);
  });
});

describe('extractShareToken', () => {
  it('returns a raw token', () => {
    expect(extractShareToken('abcdefghijklmnopqrstuv')).toBe('abcdefghijklmnopqrstuv');
  });

  it('extracts web ?token=', () => {
    expect(extractShareToken('https://example.com/app/?token=abc123token9')).toBe('abc123token9');
  });

  it('extracts Telegram startapp links', () => {
    expect(extractShareToken('https://t.me/my_bot?startapp=abc123token9')).toBe('abc123token9');
  });

  it('extracts /start share_ deep links', () => {
    expect(extractShareToken('https://t.me/my_bot?start=share_abc123token9')).toBe('abc123token9');
  });

  it('extracts tgWebAppStartParam', () => {
    expect(extractShareToken('https://example.com/?tgWebAppStartParam=abc123token9')).toBe('abc123token9');
  });

  it('returns null for empty input', () => {
    expect(extractShareToken('   ')).toBeNull();
  });
});
