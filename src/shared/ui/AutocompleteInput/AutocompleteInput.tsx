import React, { useRef, useEffect } from 'react';
import styles from './AutocompleteInput.module.css';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  isOpen: boolean;
  onSelectSuggestion: (value: string) => void;
  onCloseSuggestions: () => void;
  placeholder: string;
  label?: string;
  hideLabel?: boolean; // Новый пропс для скрытия label
  required?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  suggestions,
  isOpen,
  onSelectSuggestion,
  onCloseSuggestions,
  placeholder,
  label,
  hideLabel = false, // Значение по умолчанию
  required = false,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Закрытие подсказок при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        onCloseSuggestions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onCloseSuggestions]);

  // Обработка нажатия клавиш
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onCloseSuggestions();
      inputRef.current?.blur(); // Снимаем фокус с инпута
    } else if (e.key === 'Enter' && suggestions.length > 0 && isOpen) {
      // Выбираем первую подсказку при нажатии Enter
      onSelectSuggestion(suggestions[0]);
      onCloseSuggestions();
    } else if (e.key === 'Tab' && isOpen) {
      // Закрываем подсказки при переходе на другой элемент
      onCloseSuggestions();
    }
  };

  // Обработчик выбора подсказки
  const handleSuggestionClick = (suggestion: string) => {
    onSelectSuggestion(suggestion);
    onCloseSuggestions(); // Немедленно закрываем подсказки
    inputRef.current?.focus(); // Возвращаем фокус на инпут
  };

  // Обработчик потери фокуса
  const handleBlur = () => {
    // Небольшая задержка перед закрытием, чтобы успел сработать onClick на подсказке
    setTimeout(() => {
      if (isOpen) {
        onCloseSuggestions();
      }
    }, 200);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Показываем label только если hideLabel = false */}
      {label && !hideLabel && (
        <label className={styles.label}>
          {label}
          {/* required && <span className={styles.required}> *</span> */}
        </label>
      )}
      
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {}} // Оставлено для consistency, но не выполняет действий
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={styles.input}
          aria-label={ariaLabel || label}
          aria-describedby={ariaDescribedBy}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? "autocomplete-suggestions" : undefined}
          role="combobox"
        />
        
        {isOpen && suggestions.length > 0 && (
          <div 
            id="autocomplete-suggestions"
            className={styles.suggestionsList}
            role="listbox"
            aria-label="Предложения"
          >
            {suggestions.map((item, index) => (
              <button
                key={`${item}-${index}`}
                type="button"
                onClick={() => handleSuggestionClick(item)}
                className={styles.suggestionItem}
                role="option"
                aria-selected={item === value}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSuggestionClick(item);
                  }
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {/* Показываем сообщение, если нет подсказок, но есть запрос */}
        {isOpen && suggestions.length === 0 && value && (
          <div className={styles.noSuggestions}>
            Ничего не найдено
          </div>
        )}
      </div>
    </div>
  );
};

export default AutocompleteInput;