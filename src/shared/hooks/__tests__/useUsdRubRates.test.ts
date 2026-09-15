import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUsdRubRate, useUsdRubRates } from '../useUsdRubRates';

const { loadUsdRubRates } = vi.hoisted(() => ({
  loadUsdRubRates: vi.fn(),
}));

vi.mock('@services/cbrUsd', () => ({
  loadUsdRubRates,
}));

describe('useUsdRubRates', () => {
  beforeEach(() => {
    loadUsdRubRates.mockReset();
    loadUsdRubRates.mockResolvedValue(new Map([['2026-05-01', 90]]));
  });

  it('loads unique dates and exposes a single-date helper', async () => {
    const { result } = renderHook(() => useUsdRubRates(['2026-05-01', '2026-05-01']));
    await waitFor(() => {
      expect(result.current.get('2026-05-01')).toBe(90);
    });
    expect(loadUsdRubRates).toHaveBeenCalledWith(['2026-05-01']);

    const single = renderHook(() => useUsdRubRate('2026-05-01'));
    await waitFor(() => {
      expect(single.result.current).toBe(90);
    });
  });

  it('clears rates when there are no dates', async () => {
    const { result } = renderHook(() => useUsdRubRates([]));
    await waitFor(() => {
      expect(result.current.size).toBe(0);
    });
    expect(loadUsdRubRates).not.toHaveBeenCalled();
  });
});
