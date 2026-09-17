import React, { useCallback } from 'react';
import { t } from '@shared/i18n';
import { AutocompleteInput } from '@shared/ui';
import { useAutocomplete, FlightFormData } from '@shared/hooks';
import styles from './AirlineSection.module.css';

const SUGGESTION_LIMIT = 5;
const AUTOCOMPLETE_DELAY = 150;

interface AirlineSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
  airlines: string[];
  embedded?: boolean;
}

const AirlineSection: React.FC<AirlineSectionProps> = ({
  formData,
  updateFormData,
  airlines,
  embedded = false,
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
    <div className={`${styles.section} ${embedded ? styles.embedded : ''}`}>
      <h4 className={styles.sectionTitle}>{t('form.airlineTitle')}</h4>
      
      <div className={styles.inputContainer}>
        <div className={styles.autocompleteInput}>
          <AutocompleteInput
            value={formData.airline}
            onChange={(value: string) => updateFormData({ airline: value })}
            suggestions={airlineAutocomplete.suggestions}
            isOpen={airlineAutocomplete.isOpen}
            onSelectSuggestion={handleAirlineSelect}
            onCloseSuggestions={airlineAutocomplete.closeSuggestions}
            placeholder={t('form.airlinePlaceholder')}
            label={t('form.airlineTitle')}
            hideLabel={true}
            aria-label={t('form.airlineAria')}
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