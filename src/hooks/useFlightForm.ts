// src/hooks/useFlightForm.ts
import { useState, useCallback } from 'react';
import { Flight } from '../types';

interface FlightFormData {
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
  arrivalNextDay: boolean;
  returnArrivalNextDay: boolean;
}

export const useFlightForm = (initialDate?: string) => {
  const today = initialDate || new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<FlightFormData>({
    origin: '',
    destination: '',
    type: 'oneWay',
    departureDate: today,
    returnDate: '',
    departureTime: '',
    arrivalTime: '',
    returnDepartureTime: '',
    returnArrivalTime: '',
    isDirectThere: true,
    isDirectBack: true,
    layoverCityThere: '',
    layoverDurationThere: 60,
    layoverCityBack: '',
    layoverDurationBack: 60,
    airline: '',
    passengers: 1,
    totalPrice: '',
    arrivalNextDay: false,
    returnArrivalNextDay: false,
  });

  const updateFormData = useCallback((updates: Partial<FlightFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      origin: '',
      destination: '',
      type: 'oneWay',
      departureDate: today,
      returnDate: '',
      departureTime: '',
      arrivalTime: '',
      returnDepartureTime: '',
      returnArrivalTime: '',
      isDirectThere: true,
      isDirectBack: true,
      layoverCityThere: '',
      layoverDurationThere: 60,
      layoverCityBack: '',
      layoverDurationBack: 60,
      airline: '',
      passengers: 1,
      totalPrice: '',
      arrivalNextDay: false,
      returnArrivalNextDay: false,
    });
  }, [today]);

  const createFlightObject = useCallback((): Flight => {
    const priceNum = Number(formData.totalPrice);

    return {
      id: Date.now().toString(),
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
      dateFound: new Date().toISOString().split('T')[0],
      arrivalNextDay: formData.arrivalNextDay,
      returnArrivalNextDay: formData.type === 'roundTrip' ? formData.returnArrivalNextDay : undefined,
    };
  }, [formData]);

  return {
    formData,
    updateFormData,
    resetForm,
    createFlightObject,
  };
};