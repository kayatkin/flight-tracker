import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AutocompleteInput } from '@shared/ui';
import { useAutocomplete, FlightFormData } from '@shared/hooks';
import { getCitySuggestions } from '@shared/utils/fieldValidation';
import styles from './RouteSection.module.css';

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
  destinationCities,
}) => {
  const { t } = useTranslation();

  const originSource = useMemo(
    () => [...new Set([...originCities, ...getCitySuggestions(formData.origin, originCities, 30)])],
    [formData.origin, originCities]
  );

  const destinationSource = useMemo(
    () => [
      ...new Set([
        ...destinationCities,
        ...getCitySuggestions(formData.destination, destinationCities, 30),
      ]),
    ],
    [formData.destination, destinationCities]
  );

  const originAutocomplete = useAutocomplete(formData.origin, originSource, {
    delay: AUTOCOMPLETE_DELAY,
    maxSuggestions: SUGGESTION_LIMIT,
  });

  const destinationAutocomplete = useAutocomplete(formData.destination, destinationSource, {
    delay: AUTOCOMPLETE_DELAY,
    maxSuggestions: SUGGESTION_LIMIT,
  });

  const handleOriginSelect = useCallback(
    (selected: string) => {
      updateFormData({ origin: selected });
      originAutocomplete.closeSuggestions();
    },
    [updateFormData, originAutocomplete]
  );

  const handleDestinationSelect = useCallback(
    (selected: string) => {
      updateFormData({ destination: selected });
      destinationAutocomplete.closeSuggestions();
    },
    [updateFormData, destinationAutocomplete]
  );

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>📍 {t('route.title')}</h4>

      <div className={styles.inputsContainer}>
        <div className={styles.autocompleteInput}>
          <AutocompleteInput
            value={formData.origin}
            onChange={(value: string) => updateFormData({ origin: value })}
            suggestions={originAutocomplete.suggestions}
            isOpen={originAutocomplete.isOpen}
            onSelectSuggestion={handleOriginSelect}
            onCloseSuggestions={originAutocomplete.closeSuggestions}
            placeholder={t('route.originPlaceholder')}
            label={t('route.origin')}
            required
            aria-label={t('route.origin')}
          />
        </div>

        <div className={styles.autocompleteInput}>
          <AutocompleteInput
            value={formData.destination}
            onChange={(value: string) => updateFormData({ destination: value })}
            suggestions={destinationAutocomplete.suggestions}
            isOpen={destinationAutocomplete.isOpen}
            onSelectSuggestion={handleDestinationSelect}
            onCloseSuggestions={destinationAutocomplete.closeSuggestions}
            placeholder={t('route.destinationPlaceholder')}
            label={t('route.destination')}
            required
            aria-label={t('route.destination')}
          />
        </div>
      </div>
    </div>
  );
};

export default RouteSection;
