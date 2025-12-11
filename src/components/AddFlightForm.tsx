// src/components/AddFlightForm.tsx - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useCallback, useMemo } from 'react';
import { Flight } from '../types';
import { useAutocomplete } from '../hooks/useAutocomplete';
import { useFlightForm } from '../hooks/useFlightForm';
import { validateFlightForm, validateRoundTripDates } from '../utils/validation';
import { analyzeFlightPrice } from '../utils/flightAnalysis';
import AutocompleteInput from './AutocompleteInput';
import PriceAnalysis from './PriceAnalysis';
import styles from './AddFlightForm.module.css';

// Константы
const SUGGESTION_LIMIT = 5;
const AUTOCOMPLETE_DELAY = 150;

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

  // Фиксируем сегодняшнюю дату при монтировании компонента
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Используем кастомный хук для автодополнения
  const airlineAutocomplete = useAutocomplete(formData.airline, airlines, {
    delay: AUTOCOMPLETE_DELAY,
    maxSuggestions: SUGGESTION_LIMIT,
  });

  const originAutocomplete = useAutocomplete(formData.origin, originCities, {
    delay: AUTOCOMPLETE_DELAY,
    maxSuggestions: SUGGESTION_LIMIT,
  });

  const destinationAutocomplete = useAutocomplete(formData.destination, destinationCities, {
    delay: AUTOCOMPLETE_DELAY,
    maxSuggestions: SUGGESTION_LIMIT,
  });

  // Обработчики выбора из автодополнения
  const handleAirlineSelect = useCallback((selected: string) => {
    updateFormData({ airline: selected });
    airlineAutocomplete.closeSuggestions(); // Закрываем подсказки авиакомпаний
  }, [updateFormData, airlineAutocomplete]);

  const handleOriginSelect = useCallback((selected: string) => {
    updateFormData({ origin: selected });
    originAutocomplete.closeSuggestions(); // Закрываем подсказки города вылета
  }, [updateFormData, originAutocomplete]);

  const handleDestinationSelect = useCallback((selected: string) => {
    updateFormData({ destination: selected });
    destinationAutocomplete.closeSuggestions(); // Закрываем подсказки города назначения
  }, [updateFormData, destinationAutocomplete]);

  // Обработчики изменений
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (name === 'totalPrice') {
      const numericValue = value.replace(/\D/g, '');
      updateFormData({ totalPrice: numericValue });
      return;
    }

    updateFormData({ 
      [name]: type === 'number' ? Number(value) : value 
    });
  }, [updateFormData]);

  // Основной обработчик формы
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    const errors = validateFlightForm(formData);
    if (errors.length > 0) {
      alert(errors.join('\n'));
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
        alert('Дата и время обратного вылета должны быть позже времени прилёта "туда"');
        return;
      }
    }

    const priceNum = Number(formData.totalPrice);
    if (!formData.totalPrice || priceNum <= 0) {
      alert('Укажите корректную стоимость (только цифры, больше 0)');
      return;
    }

    // Создание объекта Flight
    const newFlight = createFlightObject();

    // Анализ цены
    const priceAnalysis = analyzeFlightPrice(newFlight, flights);
    setAnalysis(priceAnalysis);

    // Вызов родительского обработчика
    onAdd(newFlight);
    
    // Переход на историю через 1 секунду
    setTimeout(() => {
      setAnalysis(null);
      if (onNavigateToHistory) {
        onNavigateToHistory();
      }
    }, 1000);
  }, [formData, createFlightObject, flights, onAdd, onNavigateToHistory]);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Города с новым AutocompleteInput */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>📍 Маршрут</h4>
        
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

      {/* Тип рейса */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>✈️ Тип рейса</h4>
        <div className={styles.radioGroup}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="type"
              checked={formData.type === 'oneWay'}
              onChange={() => updateFormData({ type: 'oneWay' })}
              className={styles.radioInput}
              aria-label="Только туда"
            />
            Только туда
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="type"
              checked={formData.type === 'roundTrip'}
              onChange={() => updateFormData({ type: 'roundTrip' })}
              className={styles.radioInput}
              aria-label="Туда и обратно"
            />
            Туда и обратно
          </label>
        </div>
      </div>

      {/* Дата и время */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>📅 Дата и время</h4>
        <div>
          <label className={styles.label}>Дата вылета</label>
          <input
            type="date"
            name="departureDate"
            value={formData.departureDate}
            onChange={handleChange}
            min={today}
            required
            className={styles.dateInput}
            aria-label="Дата вылета"
          />
        </div>
        <div className={styles.timeRow}>
          <div className={styles.timeGroup}>
            <label className={styles.label}>Вылет (время)</label>
            <input
              type="time"
              name="departureTime"
              value={formData.departureTime}
              onChange={handleChange}
              className={styles.timeInput}
              aria-label="Время вылета"
            />
          </div>
          <div className={styles.timeGroup}>
            <label className={styles.label}>Прилёт (время)</label>
            <input
              type="time"
              name="arrivalTime"
              value={formData.arrivalTime}
              onChange={handleChange}
              className={styles.timeInput}
              aria-label="Время прилета"
            />
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.arrivalNextDay}
                onChange={(e) => updateFormData({ arrivalNextDay: e.target.checked })}
                aria-label="Прилёт на следующий день"
              />
              Прилёт на следующий день (+1)
            </label>
          </div>
        </div>

        {formData.type === 'roundTrip' && (
          <>
            <div>
              <label className={styles.label}>Дата возвращения</label>
              <input
                type="date"
                name="returnDate"
                value={formData.returnDate}
                onChange={handleChange}
                min={formData.departureDate}
                required
                className={styles.dateInput}
                aria-label="Дата возвращения"
              />
            </div>
            <div className={styles.timeRow}>
              <div className={styles.timeGroup}>
                <label className={styles.label}>Обратный вылет</label>
                <input
                  type="time"
                  name="returnDepartureTime"
                  value={formData.returnDepartureTime || ''}
                  onChange={handleChange}
                  className={styles.timeInput}
                  aria-label="Время обратного вылета"
                />
              </div>
              <div className={styles.timeGroup}>
                <label className={styles.label}>Обратный прилёт</label>
                <input
                  type="time"
                  name="returnArrivalTime"
                  value={formData.returnArrivalTime || ''}
                  onChange={handleChange}
                  className={styles.timeInput}
                  aria-label="Время обратного прилета"
                />
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.returnArrivalNextDay}
                    onChange={(e) => updateFormData({ returnArrivalNextDay: e.target.checked })}
                    aria-label="Обратный прилёт на следующий день"
                  />
                  Прилёт на следующий день (+1)
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Пересадки */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>🔄 Пересадки</h4>
        <div>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.isDirectThere}
              onChange={(e) => updateFormData({ isDirectThere: e.target.checked })}
              aria-label="Прямой рейс туда"
            />
            Прямой рейс туда
          </label>
          {!formData.isDirectThere && (
            <div className={styles.layoverGroup}>
              <div>
                <label className={styles.label}>Город пересадки (туда)</label>
                <input
                  type="text"
                  value={formData.layoverCityThere || ''}
                  onChange={(e) => updateFormData({ layoverCityThere: e.target.value })}
                  placeholder="Стамбул"
                  className={styles.layoverInput}
                  aria-label="Город пересадки туда"
                />
              </div>
              <div>
                <label className={styles.label}>Длительность (мин)</label>
                <input
                  type="number"
                  value={formData.layoverDurationThere || 60}
                  onChange={(e) => updateFormData({ 
                    layoverDurationThere: Number(e.target.value) || 60 
                  })}
                  min="30"
                  max="1440"
                  className={styles.layoverInput}
                  aria-label="Длительность пересадки туда в минутах"
                />
              </div>
            </div>
          )}
        </div>

        {formData.type === 'roundTrip' && (
          <div>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isDirectBack}
                onChange={(e) => updateFormData({ isDirectBack: e.target.checked })}
                aria-label="Прямой рейс обратно"
              />
              Прямой рейс обратно
            </label>
            {!formData.isDirectBack && (
              <div className={styles.layoverGroup}>
                <div>
                  <label className={styles.label}>Город пересадки (обратно)</label>
                  <input
                    type="text"
                    value={formData.layoverCityBack || ''}
                    onChange={(e) => updateFormData({ layoverCityBack: e.target.value })}
                    placeholder="Доха"
                    className={styles.layoverInput}
                    aria-label="Город пересадки обратно"
                  />
                </div>
                <div>
                  <label className={styles.label}>Длительность (мин)</label>
                  <input
                    type="number"
                    value={formData.layoverDurationBack || 60}
                    onChange={(e) => updateFormData({ 
                      layoverDurationBack: Number(e.target.value) || 60 
                    })}
                    min="30"
                    max="1440"
                    className={styles.layoverInput}
                    aria-label="Длительность пересадки обратно в минутах"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Авиакомпания с новым AutocompleteInput */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>✈️ Авиакомпания</h4>
        <AutocompleteInput
          value={formData.airline}
          onChange={(value: string) => updateFormData({ airline: value })}
          suggestions={airlineAutocomplete.suggestions}
          isOpen={airlineAutocomplete.isOpen}
          onSelectSuggestion={handleAirlineSelect}
          onCloseSuggestions={airlineAutocomplete.closeSuggestions}
          placeholder="Начните вводить..."
          label="Авиакомпания"
          required
          aria-label="Авиакомпания"
        />
      </div>

      {/* Пассажиры */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>👥 Пассажиры</h4>
        <select
          name="passengers"
          value={formData.passengers}
          onChange={handleChange as any}
          className={styles.select}
          aria-label="Количество пассажиров"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </div>

      {/* Стоимость */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>💰 Стоимость</h4>
        <input
          type="text"
          name="totalPrice"
          value={formData.totalPrice}
          onChange={handleChange}
          placeholder="12500"
          inputMode="numeric"
          className={styles.input}
          aria-label="Стоимость билета в рублях"
        />
      </div>

      {/* Анализ */}
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