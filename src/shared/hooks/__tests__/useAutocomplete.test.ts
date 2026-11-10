import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutocomplete } from '../useAutocomplete';

describe('useAutocomplete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not open for a prefilled exact match', () => {
    const { result } = renderHook(() =>
      useAutocomplete('Кемерово', ['Кемерово', 'Москва'], { delay: 150 })
    );

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.suggestions).toEqual([]);
  });

  it('stays closed until the field is focused', () => {
    const { result } = renderHook(() =>
      useAutocomplete('Кем', ['Кемерово'], { delay: 150 })
    );

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.openSuggestions();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.suggestions).toEqual(['Кемерово']);
  });

  it('does not reopen after close while the value is unchanged', () => {
    const { result } = renderHook(() =>
      useAutocomplete('Кем', ['Кемерово'], { delay: 150 })
    );

    act(() => {
      vi.advanceTimersByTime(150);
      result.current.openSuggestions();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.closeSuggestions();
      vi.advanceTimersByTime(150);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('hides the list after selecting a suggestion', () => {
    const { result } = renderHook(() =>
      useAutocomplete('Аэр', ['Аэрофлот'], { delay: 150 })
    );

    act(() => {
      vi.advanceTimersByTime(150);
      result.current.openSuggestions();
      result.current.selectSuggestion('Аэрофлот');
    });

    expect(result.current.isOpen).toBe(false);
  });
});
