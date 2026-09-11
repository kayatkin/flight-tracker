// src/shared/hooks/useFlightForm.ts
import { useState, useCallback } from 'react';
import { Flight } from '../../shared/types';
import { generateUUID } from '../utils/id';
import { toLocalISODate } from '../utils/date';
import {
  createEmptyFlightForm,
  flightToFormData,
  isFlightFormDirty,
} from '../utils/flightFormMapping';

export interface CreateFlightOptions {
  id?: string;
  dateFound?: string;
}

// ДОБАВЛЯЕМ export!
export interface FlightFormData {
  origin: string;
  destination: string;
  type: 'oneWay' | 'roundTrip';
  departureDate: string;
  returnDate: string;
  departureTime: string;
  arrivalTime: string;
  returnDepartureTime: string;
  returnArrivalTime: string;
  isDirectThere: boolean;
  isDirectBack: boolean;
  layoverCityThere: string;
  layoverDurationThere: number;
  layoverCityBack: string;
  layoverDurationBack: number;
  airline: string;
  passengers: 1 | 2 | 3 | 4;
  totalPrice: string;
  notes: string;
  arrivalNextDay: boolean;
  returnArrivalNextDay: boolean;
}

export const useFlightForm = (
  initialDate?: string,
  initialDraft?: FlightFormData | null,
  initialBaseline?: FlightFormData | null
) => {
  const today = initialDate || toLocalISODate();
  const emptyForm = createEmptyFlightForm(today);

  const [formData, setFormData] = useState<FlightFormData>(
    initialDraft ?? initialBaseline ?? emptyForm
  );
  const [baseline, setBaseline] = useState<FlightFormData>(initialBaseline ?? emptyForm);

  const updateFormData = useCallback((updates: Partial<FlightFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    const next = createEmptyFlightForm(today);
    setFormData(next);
    setBaseline(next);
  }, [today]);

  const hydrateFromFlight = useCallback((flight: Flight) => {
    const next = flightToFormData(flight);
    setFormData(next);
    setBaseline(next);
  }, []);

  const markClean = useCallback(() => {
    setBaseline(formData);
  }, [formData]);

  const createFlightObject = useCallback((options?: CreateFlightOptions): Flight => {
    const priceNum = Number(formData.totalPrice);

    return {
      id: options?.id ?? generateUUID(),
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
      type: formData.type,
      departureDate: formData.departureDate,
      returnDate: formData.type === 'roundTrip' ? formData.returnDate : undefined,
      departureTime: formData.departureTime || undefined,
      arrivalTime: formData.arrivalTime || undefined,
      returnDepartureTime: formData.type === 'roundTrip' ? formData.returnDepartureTime : undefined,
      returnArrivalTime: formData.type === 'roundTrip' ? formData.returnArrivalTime : undefined,
      isDirectThere: formData.isDirectThere,
      isDirectBack: formData.isDirectBack,
      layoverCityThere: formData.isDirectThere ? undefined : formData.layoverCityThere.trim() || undefined,
      layoverDurationThere: formData.isDirectThere ? undefined : formData.layoverDurationThere,
      layoverCityBack: formData.type === 'roundTrip' && !formData.isDirectBack
        ? formData.layoverCityBack.trim() || undefined
        : undefined,
      layoverDurationBack: formData.type === 'roundTrip' && !formData.isDirectBack
        ? formData.layoverDurationBack
        : undefined,
      airline: formData.airline.trim(),
      passengers: formData.passengers,
      totalPrice: priceNum,
      dateFound: options?.dateFound ?? toLocalISODate(),
      notes: formData.notes.trim() || undefined,
      arrivalNextDay: formData.arrivalNextDay,
      returnArrivalNextDay: formData.type === 'roundTrip' ? formData.returnArrivalNextDay : undefined,
    };
  }, [formData]);

  return {
    formData,
    isDirty: isFlightFormDirty(formData, baseline),
    updateFormData,
    resetForm,
    hydrateFromFlight,
    markClean,
    createFlightObject,
  };
};