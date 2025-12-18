// src\shared\hooks\useAutocomplete.ts
import { useState, useEffect, useCallback, useRef } from 'react';

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

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Дебаунс запроса
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Устанавливаем новый таймер
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    // Функция очистки
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query, delay]);

  // Фильтрация предложений
  useEffect(() => {
    if (debouncedQuery && source.length > 0) {
      const filtered = source
        .filter(item => filterFn(item, debouncedQuery))
        .slice(0, maxSuggestions);
      
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [debouncedQuery, source, maxSuggestions, filterFn]);

  // Функция выбора подсказки
  const selectSuggestion = useCallback((selected: string) => {
    // 1. Очищаем подсказки немедленно
    setSuggestions([]);
    setIsOpen(false);
    
    // 2. Очищаем таймер дебаунса (ВАЖНО!)
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // 3. Сбрасываем debouncedQuery чтобы предотвратить повторную фильтрацию
    setDebouncedQuery(selected);
    
    // 4. Возвращаем выбранное значение
    return selected;
  }, []);

  // Функция закрытия подсказок
  const closeSuggestions = useCallback(() => {
    // 1. Немедленно закрываем подсказки
    setIsOpen(false);
    setSuggestions([]);
    
    // 2. Очищаем таймер дебаунса
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // 3. Сбрасываем debouncedQuery чтобы предотвратить повторную фильтрацию
    setDebouncedQuery('');
  }, []);

  return {
    suggestions,
    isOpen,
    selectSuggestion,
    closeSuggestions,
  };
};