import React, { useState, useCallback } from 'react';
import { Flight } from '@shared/types';
import { useFlightForm } from '@shared/hooks';
import { validateFlightForm, validateRoundTripDates, analyzeFlightPrice } from '@shared/utils';
import { toast } from '@shared/ui/Toast';
import { PriceAnalysis } from '@features/flights';

// Импортируем все компоненты
import RouteSection from './components/RouteSection/RouteSection';
import FlightTypeSection from './components/FlightTypeSection/FlightTypeSection';
import DateTimeSection from './components/DateTimeSection/DateTimeSection';
import LayoverSection from './components/LayoverSection/LayoverSection';
import AirlineSection from './components/AirlineSection/AirlineSection';
import PassengersSection from './components/PassengersSection/PassengersSection';
import PriceSection from './components/PriceSection/PriceSection';

import styles from './AddFlightForm.module.css';

interface AddFlightFormProps {
  flights: Flight[];
  airlines: string[];
  originCities: string[];
  destinationCities: string[];
  onAdd: (flight: Flight) => void;
  onNavigateToHistory?: () => void;
}

const AddFlightForm: React.FC<AddFlightFormProps> = ({ 
  flights, 
  airlines, 
  originCities, 
  destinationCities, 
  onAdd,
  onNavigateToHistory 
}) => {
  const { formData, updateFormData, createFlightObject } = useFlightForm();
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeFlightPrice> | null>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateFlightForm(formData);
    if (errors.length > 0) {
      toast(errors.join('\n'), 'error');
      return;
    }

    if (formData.type === 'roundTrip') {
      const isValidDates = validateRoundTripDates(
        formData.departureDate,
        formData.arrivalTime,
        formData.arrivalNextDay,
        formData.returnDate,
        formData.returnDepartureTime
      );
      
      if (!isValidDates) {
        toast('Дата и время обратного вылета должны быть позже времени прилёта «туда»', 'warning');
        return;
      }
    }

    const priceNum = Number(formData.totalPrice);
    if (!formData.totalPrice || priceNum <= 0) {
      toast('Укажите корректную стоимость (только цифры, больше 0)', 'error');
      return;
    }

    const newFlight = createFlightObject();
    const priceAnalysis = analyzeFlightPrice(newFlight, flights);
    setAnalysis(priceAnalysis);

    onAdd(newFlight);
    
    setTimeout(() => {
      setAnalysis(null);
      onNavigateToHistory?.();
    }, 1000);
  }, [formData, createFlightObject, flights, onAdd, onNavigateToHistory]);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <RouteSection
        formData={formData}
        updateFormData={updateFormData}
        originCities={originCities}
        destinationCities={destinationCities}
      />

      <FlightTypeSection
        formData={formData}
        updateFormData={updateFormData}
      />

      <DateTimeSection
        formData={formData}
        updateFormData={updateFormData}
      />

      <LayoverSection
        formData={formData}
        updateFormData={updateFormData}
      />

      <AirlineSection
        formData={formData}
        updateFormData={updateFormData}
        airlines={airlines}
      />

      <PassengersSection
        formData={formData}
        updateFormData={updateFormData}
      />

      <PriceSection
        formData={formData}
        updateFormData={updateFormData}
      />

      {analysis && (
        <PriceAnalysis
          type={analysis.type}
          message={analysis.message}
          diff={analysis.diff}
        />
      )}

      <button 
        type="submit" 
        className={styles.submitButton}
        aria-label="Сохранить билет"
      >
        💼 Сохранить билет
      </button>
    </form>
  );
};

export default AddFlightForm;