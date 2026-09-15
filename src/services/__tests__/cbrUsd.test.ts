import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadUsdRubRates, resetUsdRubCacheForTests } from '../cbrUsd';

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@shared/lib', () => ({
  supabase: { functions: { invoke } },
}));

describe('loadUsdRubRates', () => {
  beforeEach(() => {
    resetUsdRubCacheForTests();
    invoke.mockReset();
    localStorage.clear();
  });

  it('asks fx-usd only for missing dates and caches the quote', async () => {
    invoke.mockResolvedValue({
      data: { ok: true, rates: { '2026-05-01': { usdRub: 90.5, cbrDate: '2026-04-30' } } },
      error: null,
    });

    const first = await loadUsdRubRates(['2026-05-01', '2026-05-01', 'bad']);
    expect(first.get('2026-05-01')).toBe(90.5);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('fx-usd', { body: { dates: ['2026-05-01'] } });

    const second = await loadUsdRubRates(['2026-05-01']);
    expect(second.get('2026-05-01')).toBe(90.5);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('keeps already known rates when the function fails', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'down' } });
    const rates = await loadUsdRubRates(['2026-09-15']);
    expect(rates.size).toBe(0);
  });
});
