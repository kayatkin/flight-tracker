import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyToClipboard } from '../clipboard';

describe('copyToClipboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses the clipboard API when it succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when clipboard API is missing', async () => {
    vi.stubGlobal('navigator', {});
    document.execCommand = vi.fn(() => true);

    await expect(copyToClipboard('fallback')).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });
});
