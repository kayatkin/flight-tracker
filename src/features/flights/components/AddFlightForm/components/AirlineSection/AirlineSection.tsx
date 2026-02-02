import React, { useCallback } from 'react';
import { AutocompleteInput } from '@shared/ui';
import { useAutocomplete, FlightFormData } from '@shared/hooks';
import styles from './AirlineSection.module.css';

const SUGGESTION_LIMIT = 5;
const AUTOCOMPLETE_DELAY = 150;

interface AirlineSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
  airlines: string[];
}

const AirlineSection: React.FC<AirlineSectionProps> = ({
  formData,
  updateFormData,
  airlines
}) => {
  const airlineAutocomplete = useAutocomplete(formData.airline, airlines, {
    delay: AUTOCOMPLETE_DELAY,
    maxSuggestions: SUGGESTION_LIMIT,
  });

  const handleAirlineSelect = useCallback((selected: string) => {
    updateFormData({ airline: selected });
    airlineAutocomplete.closeSuggestions();
  }, [updateFormData, airlineAutocomplete]);

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>✈️ Авиакомпания</h4>
      
      <div className={styles.inputContainer}>
        <div className={styles.autocompleteInput}>
          <AutocompleteInput
            value={formData.airline}
            onChange={(value: string) => updateFormData({ airline: value })}
            suggestions={airlineAutocomplete.suggestions}
            isOpen={airlineAutocomplete.isOpen}
            onSelectSuggestion={handleAirlineSelect}
            onCloseSuggestions={airlineAutocomplete.closeSuggestions}
            placeholder="Аэрофлот, S7, Победа..."
            label="Авиакомпания"
            hideLabel={true}
            required
            aria-label="Название авиакомпании"
          />
        </div>
        {/* УБИРАЕМ ЭТУ ПОДСКАЗКУ - она избыточна */}
        {/* 
        <p className={styles.hint}>
          Введите название авиакомпании: Аэрофлот, S7, Победа, Utair, Nordwind...
        </p>
        */}
      </div>
    </div>
  );
};

export default AirlineSection;