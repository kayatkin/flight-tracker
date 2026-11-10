import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface UseAutocompleteOptions {
  delay?: number;
  maxSuggestions?: number;
  filterFn?: (item: string, query: string) => boolean;
}

const defaultFilter = (item: string, query: string) =>
  item.toLowerCase().includes(query.toLowerCase());

export const useAutocomplete = (
  query: string,
  source: string[],
  options: UseAutocompleteOptions = {}
) => {
  const {
    delay = 150,
    maxSuggestions = 5,
    filterFn = defaultFilter,
  } = options;

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query, delay]);

  const suggestions = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q || source.length === 0) return [];
    const lower = q.toLowerCase();
    return source
      .filter((item) => filterFn(item, q) && item.toLowerCase() !== lower)
      .slice(0, maxSuggestions);
  }, [debouncedQuery, source, maxSuggestions, filterFn]);

  const isOpen = active && suggestions.length > 0;

  const selectSuggestion = useCallback((selected: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setDebouncedQuery(selected);
    setActive(false);
    return selected;
  }, []);

  const closeSuggestions = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setActive(false);
  }, []);

  const openSuggestions = useCallback(() => {
    setActive(true);
  }, []);

  return {
    suggestions,
    isOpen,
    selectSuggestion,
    closeSuggestions,
    openSuggestions,
  };
};
