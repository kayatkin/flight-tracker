import { describe, it, expect } from 'vitest';
import { extractShareToken } from '../shareToken';

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
