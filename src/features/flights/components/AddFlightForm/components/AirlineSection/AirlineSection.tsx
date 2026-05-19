import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AutocompleteInput } from '@shared/ui';
import { useAutocomplete, FlightFormData } from '@shared/hooks';
import { getAirlineSuggestions } from '@shared/utils/fieldValidation';
import styles from './AirlineSection.module.css';

const SUGGESTION_LIMIT = 5;
const AUTOCOMPLETE_DELAY = 150;

interface AirlineSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
  airlines: string[];
}

const AirlineSection: React.FC<AirlineSectionProps> = ({ formData, updateFormData, airlines }) => {
  const { t } = useTranslation();

  const airlineSource = useMemo(
    () => [...new Set([...airlines, ...getAirlineSuggestions(formData.airline, airlines, 30)])],
    [formData.airline, airlines]
  );

  const airlineAutocomplete = useAutocomplete(formData.airline, airlineSource, {
    delay: AUTOCOMPLETE_DELAY,
    maxSuggestions: SUGGESTION_LIMIT,
  });

  const handleAirlineSelect = useCallback(
    (selected: string) => {
      updateFormData({ airline: selected });
      airlineAutocomplete.closeSuggestions();
    },
    [updateFormData, airlineAutocomplete]
  );

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>✈️ {t('airline.title')}</h4>

      <div className={styles.inputContainer}>
        <div className={styles.autocompleteInput}>
          <AutocompleteInput
            value={formData.airline}
            onChange={(value: string) => updateFormData({ airline: value })}
            suggestions={airlineAutocomplete.suggestions}
            isOpen={airlineAutocomplete.isOpen}
            onSelectSuggestion={handleAirlineSelect}
            onCloseSuggestions={airlineAutocomplete.closeSuggestions}
            placeholder={t('airline.placeholder')}
            label={t('airline.label')}
            hideLabel={true}
            required
            aria-label={t('airline.label')}
          />
        </div>
      </div>
    </div>
  );
};

export default AirlineSection;
