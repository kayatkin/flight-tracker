// src\shared\hooks\useAutocomplete.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface UseAutocompleteOptions {
  delay?: number;
  maxSuggestions?: number;
  filterFn?: (item: string, query: string) => boolean;
}

export const useAutocomplete = (
  query: string,
  source: string[],
  options: UseAutocompleteOptions = {}
) => {
  const {
    delay = 150,
    maxSuggestions = 5,
    filterFn = (item, query) => item.toLowerCase().includes(query.toLowerCase())
  } = options;

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Дебаунс запроса
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

  // Используем useMemo для фильтрации
  const suggestions = useMemo(() => {
    if (debouncedQuery && source.length > 0) {
      return source
        .filter(item => filterFn(item, debouncedQuery))
        .slice(0, maxSuggestions);
    }
    return [];
  }, [debouncedQuery, source, maxSuggestions, filterFn]);

  const isOpen = useMemo(() => 
    suggestions.length > 0, 
    [suggestions]
  );

  // Функция выбора подсказки
  const selectSuggestion = useCallback((selected: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setDebouncedQuery(selected);
    return selected;
  }, []);

  // Функция закрытия подсказок
  const closeSuggestions = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setDebouncedQuery('');
  }, []);

  return {
    suggestions,
    isOpen,
    selectSuggestion,
    closeSuggestions,
  };
};