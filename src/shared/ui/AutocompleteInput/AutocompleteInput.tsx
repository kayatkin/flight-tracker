import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  hideLabel?: boolean;
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
  hideLabel = false,
  required = false,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onCloseSuggestions();
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && suggestions.length > 0 && isOpen) {
      onSelectSuggestion(suggestions[0]);
      onCloseSuggestions();
    } else if (e.key === 'Tab' && isOpen) {
      onCloseSuggestions();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSelectSuggestion(suggestion);
    onCloseSuggestions();
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (isOpen) {
        onCloseSuggestions();
      }
    }, 200);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {label && !hideLabel && (
        <label className={styles.label}>
          {label}
        </label>
      )}
      
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {}}
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
            aria-label={t('autocomplete.suggestions')}
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

        {isOpen && suggestions.length === 0 && value && (
          <div className={styles.noSuggestions}>
            {t('autocomplete.empty')}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutocompleteInput;
