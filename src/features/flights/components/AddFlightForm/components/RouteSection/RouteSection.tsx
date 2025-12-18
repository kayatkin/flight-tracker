import React, { useCallback } from 'react';
import { AutocompleteInput } from '@shared/ui';
import { useAutocomplete, FlightFormData } from '@shared/hooks';
import styles from './RouteSection.module.css';

// Константы можно вынести в отдельный файл или оставить здесь
const SUGGESTION_LIMIT = 5;
const AUTOCOMPLETE_DELAY = 150;

interface RouteSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
  originCities: string[];
  destinationCities: string[];
}

const RouteSection: React.FC<RouteSectionProps> = ({
  formData,
  updateFormData,
  originCities,
  destinationCities
}) => {
  // Автодополнение для города вылета
  const originAutocomplete = useAutocomplete(formData.origin, originCities, {
    delay: AUTOCOMPLETE_DELAY,
    maxSuggestions: SUGGESTION_LIMIT,
  });

  // Автодополнение для города назначения
  const destinationAutocomplete = useAutocomplete(formData.destination, destinationCities, {
    delay: AUTOCOMPLETE_DELAY,
    maxSuggestions: SUGGESTION_LIMIT,
  });

  const handleOriginSelect = useCallback((selected: string) => {
    updateFormData({ origin: selected });
    originAutocomplete.closeSuggestions();
  }, [updateFormData, originAutocomplete]);

  const handleDestinationSelect = useCallback((selected: string) => {
    updateFormData({ destination: selected });
    destinationAutocomplete.closeSuggestions();
  }, [updateFormData, destinationAutocomplete]);

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>📍 Маршрут</h4>
      
      <div className={styles.inputsContainer}>
        {/* Обертка с классом для первого автодополнения */}
        <div className={styles.autocompleteInput}>
          <AutocompleteInput
            value={formData.origin}
            onChange={(value: string) => updateFormData({ origin: value })}
            suggestions={originAutocomplete.suggestions}
            isOpen={originAutocomplete.isOpen}
            onSelectSuggestion={handleOriginSelect}
            onCloseSuggestions={originAutocomplete.closeSuggestions}
            placeholder="Москва"
            label="Город вылета"
            required
            aria-label="Город вылета"
          />
        </div>

        {/* Обертка с классом для второго автодополнения */}
        <div className={styles.autocompleteInput}>
          <AutocompleteInput
            value={formData.destination}
            onChange={(value: string) => updateFormData({ destination: value })}
            suggestions={destinationAutocomplete.suggestions}
            isOpen={destinationAutocomplete.isOpen}
            onSelectSuggestion={handleDestinationSelect}
            onCloseSuggestions={destinationAutocomplete.closeSuggestions}
            placeholder="Тбилиси"
            label="Город назначения"
            required
            aria-label="Город назначения"
          />
        </div>
      </div>
    </div>
  );
};

export default RouteSection;