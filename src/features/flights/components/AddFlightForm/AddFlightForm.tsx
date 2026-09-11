import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Flight } from '@shared/types';
import { useFlightForm } from '@shared/hooks';
import {
  validateFlightForm,
  validateRoundTripDates,
  analyzeFlightPrice,
  confirmDiscardUnsaved,
  readFormDraft,
  writeFormDraft,
  clearFormDraft,
  readEditFormDraft,
  writeEditFormDraft,
  clearEditFormDraft,
  toLocalISODate,
  flightToFormData,
} from '@shared/utils';
import { toast } from '@shared/ui/Toast';
import { PriceAnalysis } from '@features/flights';

import RouteSection from './components/RouteSection/RouteSection';
import FlightTypeSection from './components/FlightTypeSection/FlightTypeSection';
import DateTimeSection from './components/DateTimeSection/DateTimeSection';
import LayoverSection from './components/LayoverSection/LayoverSection';
import AirlineSection from './components/AirlineSection/AirlineSection';
import PassengersSection from './components/PassengersSection/PassengersSection';
import PriceSection from './components/PriceSection/PriceSection';
import NotesSection from './components/NotesSection/NotesSection';

import styles from './AddFlightForm.module.css';

interface AddFlightFormProps {
  flights: Flight[];
  airlines: string[];
  originCities: string[];
  destinationCities: string[];
  onAdd: (flight: Flight) => void;
  onUpdate?: (flight: Flight) => void;
  onCancelEdit?: () => void;
  onNavigateToHistory?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  editingFlight?: Flight | null;
}

const AddFlightForm: React.FC<AddFlightFormProps> = ({
  flights,
  airlines,
  originCities,
  destinationCities,
  onAdd,
  onUpdate,
  onCancelEdit,
  onNavigateToHistory,
  onDirtyChange,
  editingFlight = null,
}) => {
  const storage = typeof sessionStorage === 'undefined' ? null : sessionStorage;
  const today = toLocalISODate();
  const savedForm = editingFlight ? flightToFormData(editingFlight) : null;
  const editDraft = editingFlight ? readEditFormDraft(editingFlight.id, storage, today) : null;
  const newDraft = editingFlight ? null : readFormDraft(storage, today);
  const { formData, updateFormData, createFlightObject, resetForm, markClean, isDirty } = useFlightForm(
    undefined,
    editDraft ?? (editingFlight ? savedForm : newDraft),
    savedForm
  );
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeFlightPrice> | null>(null);
  const navigateTimerRef = useRef<number | undefined>(undefined);
  const skipDraftPersistRef = useRef(false);
  const isEditing = Boolean(editingFlight);

  useEffect(() => () => {
    if (navigateTimerRef.current) {
      window.clearTimeout(navigateTimerRef.current);
    }
  }, []);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (typeof sessionStorage === 'undefined' || skipDraftPersistRef.current) return;
    if (isEditing && editingFlight) {
      if (isDirty) writeEditFormDraft(editingFlight, formData, sessionStorage);
      else clearEditFormDraft(sessionStorage);
      return;
    }
    if (isEditing) return;
    if (isDirty) writeFormDraft(formData, sessionStorage);
    else clearFormDraft(sessionStorage);
  }, [formData, isDirty, isEditing, editingFlight]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  useEffect(() => {
    if (!editingFlight) return;
    setAnalysis(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [editingFlight]);

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

    const savedFlight = createFlightObject(
      editingFlight
        ? { id: editingFlight.id, dateFound: editingFlight.dateFound }
        : undefined
    );

    const flightsForAnalysis = editingFlight
      ? flights.filter((flight) => flight.id !== editingFlight.id)
      : flights;
    const hasComparable = flightsForAnalysis.some((flight) =>
      flight.origin === savedFlight.origin &&
      flight.destination === savedFlight.destination &&
      flight.passengers === savedFlight.passengers &&
      flight.type === savedFlight.type
    );

    if (!editingFlight || hasComparable) {
      setAnalysis(analyzeFlightPrice(savedFlight, flightsForAnalysis));
    } else {
      setAnalysis(null);
    }

    if (editingFlight) {
      if (typeof sessionStorage !== 'undefined') {
        clearEditFormDraft(sessionStorage);
      }
      onUpdate?.(savedFlight);
      toast('Изменения сохранены', 'success');
      markClean();
    } else {
      skipDraftPersistRef.current = true;
      if (typeof sessionStorage !== 'undefined') {
        clearFormDraft(sessionStorage);
      }
      onAdd(savedFlight);
      resetForm();
    }

    if (navigateTimerRef.current) {
      window.clearTimeout(navigateTimerRef.current);
    }
    navigateTimerRef.current = window.setTimeout(() => {
      setAnalysis(null);
      onNavigateToHistory?.();
    }, 1000);
  }, [formData, createFlightObject, flights, onAdd, onUpdate, onNavigateToHistory, resetForm, markClean, editingFlight]);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {isEditing && (
        <div className={styles.editBanner} role="status">
          Редактирование сохранённого билета. Дата поиска не изменится.
        </div>
      )}

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

      <NotesSection
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

      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.submitButton}
          aria-label={isEditing ? 'Сохранить изменения' : 'Сохранить билет'}
        >
          {isEditing ? '💾 Сохранить изменения' : '💼 Сохранить билет'}
        </button>
        {isEditing && (
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => {
              if (isDirty && !confirmDiscardUnsaved()) return;
              onCancelEdit?.();
            }}
            aria-label="Отменить редактирование"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  );
};

export default AddFlightForm;
