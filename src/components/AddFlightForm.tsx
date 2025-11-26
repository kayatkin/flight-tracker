// src/components/AddFlightForm.tsx
import React, { useState, useEffect } from 'react';
import { Flight } from '../types';
import styles from './AddFlightForm.module.css';

interface AddFlightFormProps {
  flights: Flight[];
  airlines: string[];
  onAdd: (flight: Flight) => void;
}

const AddFlightForm: React.FC<AddFlightFormProps> = ({ flights, airlines, onAdd }) => {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    type: 'oneWay' as 'oneWay' | 'roundTrip',
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
    passengers: 1 as 1 | 2 | 3 | 4,
    totalPrice: '',
    arrivalNextDay: false,
    returnArrivalNextDay: false,
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<{
    type: 'good' | 'neutral' | 'bad';
    message: string;
    diff?: number;
  } | null>(null);

  useEffect(() => {
    if (formData.airline) {
      const term = formData.airline.toLowerCase();
      const matches = airlines
        .filter(airline => airline.toLowerCase().startsWith(term))
        .slice(0, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [formData.airline, airlines]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (name === 'totalPrice') {
      const numericValue = value.replace(/\D/g, '');
      setFormData((prev) => ({ ...prev, totalPrice: numericValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.origin || !formData.destination) {
      alert('Укажите города вылета и назначения');
      return;
    }
    if (!formData.departureDate) {
      alert('Укажите дату вылета');
      return;
    }
    if (formData.type === 'roundTrip' && !formData.returnDate) {
      alert('Укажите дату возвращения');
      return;
    }
    const priceNum = Number(formData.totalPrice);
    if (!formData.totalPrice || priceNum <= 0) {
      alert('Укажите корректную стоимость (только цифры, больше 0)');
      return;
    }

    const newFlight: Flight = {
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

    const comparableFlights = flights.filter((f) =>
      f.origin === newFlight.origin &&
      f.destination === newFlight.destination &&
      f.passengers === newFlight.passengers &&
      f.type === newFlight.type
    );

    if (comparableFlights.length === 0) {
      setAnalysis({
        type: 'good',
        message: 'Первое предложение по этому маршруту! Сохранено.',
      });
    } else {
      const best = comparableFlights.reduce((a, b) => (a.totalPrice < b.totalPrice ? a : b));
      const diff = newFlight.totalPrice - best.totalPrice;

      if (diff < -500) {
        setAnalysis({
          type: 'good',
          message: `Выгодно! Дешевле на ${Math.abs(diff)} ₽, чем лучший ранее.`,
          diff,
        });
      } else if (Math.abs(diff) <= 500) {
        setAnalysis({
          type: 'neutral',
          message: `Цена почти такая же (${diff >= 0 ? '+' : ''}${diff} ₽).`,
          diff,
        });
      } else {
        setAnalysis({
          type: 'bad',
          message: `Дороже на ${diff} ₽, чем лучший ранее. Не стоит.`,
          diff,
        });
      }
    }

    onAdd(newFlight);
    setSuggestions([]);
    setTimeout(() => setAnalysis(null), 5000);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Города */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>📍 Маршрут</h4>
        <div>
          <label className={styles.label}>Город вылета</label>
          <input
            type="text"
            name="origin"
            value={formData.origin}
            onChange={handleChange}
            placeholder="Москва"
            required
            className={styles.input}
          />
        </div>
        <div>
          <label className={styles.label}>Город назначения</label>
          <input
            type="text"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            placeholder="Тбилиси"
            required
            className={styles.input}
          />
        </div>
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
              onChange={() => setFormData((prev) => ({ ...prev, type: 'oneWay' }))}
              className={styles.radioInput}
            />
            Только туда
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="type"
              checked={formData.type === 'roundTrip'}
              onChange={() => setFormData((prev) => ({ ...prev, type: 'roundTrip' }))}
              className={styles.radioInput}
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
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <label className={styles.label}>Вылет (время)</label>
            <input
              type="time"
              name="departureTime"
              value={formData.departureTime}
              onChange={handleChange}
              className={styles.timeInput}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className={styles.label}>Прилёт (время)</label>
            <input
              type="time"
              name="arrivalTime"
              value={formData.arrivalTime}
              onChange={handleChange}
              className={styles.timeInput}
            />
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.arrivalNextDay}
                onChange={(e) => setFormData(prev => ({ ...prev, arrivalNextDay: e.target.checked }))}
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
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label className={styles.label}>Обратный вылет</label>
                <input
                  type="time"
                  name="returnDepartureTime"
                  value={formData.returnDepartureTime || ''}
                  onChange={handleChange}
                  className={styles.timeInput}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className={styles.label}>Обратный прилёт</label>
                <input
                  type="time"
                  name="returnArrivalTime"
                  value={formData.returnArrivalTime || ''}
                  onChange={handleChange}
                  className={styles.timeInput}
                />
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.returnArrivalNextDay}
                    onChange={(e) => setFormData(prev => ({ ...prev, returnArrivalNextDay: e.target.checked }))}
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
              onChange={(e) => setFormData(prev => ({ ...prev, isDirectThere: e.target.checked }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, layoverCityThere: e.target.value }))}
                  placeholder="Стамбул"
                  className={styles.layoverInput}
                />
              </div>
              <div>
                <label className={styles.label}>Длительность (мин)</label>
                <input
                  type="number"
                  value={formData.layoverDurationThere || 60}
                  onChange={(e) => setFormData(prev => ({ ...prev, layoverDurationThere: Number(e.target.value) || 60 }))}
                  min="30"
                  max="1440"
                  className={styles.layoverInput}
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
                onChange={(e) => setFormData(prev => ({ ...prev, isDirectBack: e.target.checked }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, layoverCityBack: e.target.value }))}
                    placeholder="Доха"
                    className={styles.layoverInput}
                  />
                </div>
                <div>
                  <label className={styles.label}>Длительность (мин)</label>
                  <input
                    type="number"
                    value={formData.layoverDurationBack || 60}
                    onChange={(e) => setFormData(prev => ({ ...prev, layoverDurationBack: Number(e.target.value) || 60 }))}
                    min="30"
                    max="1440"
                    className={styles.layoverInput}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Авиакомпания */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>✈️ Авиакомпания</h4>
        <div className={styles.suggestionsContainer}>
          <input
            type="text"
            name="airline"
            value={formData.airline}
            onChange={handleChange}
            placeholder="Начните вводить..."
            required
            className={styles.input}
            autoComplete="off"
          />
          {formData.airline && suggestions.length > 0 && (
            <div className={styles.suggestionsList}>
              {suggestions.map((airline, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, airline }));
                    setSuggestions([]);
                  }}
                  className={styles.suggestionItem}
                >
                  {airline}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Пассажиры */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>👥 Пассажиры</h4>
        <select
          name="passengers"
          value={formData.passengers}
          onChange={handleChange as any}
          className={styles.select}
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
        />
      </div>

      {/* Анализ */}
      {analysis && (
        <div className={
          analysis.type === 'good'
            ? styles.analysisGood
            : analysis.type === 'neutral'
              ? styles.analysisNeutral
              : styles.analysisBad
        }>
          <div>{analysis.message}</div>
          {analysis.diff !== undefined && (
            <div style={{ fontSize: '14px', marginTop: '4px' }}>
              Разница: {analysis.diff > 0 ? '+' : ''}{analysis.diff} ₽
            </div>
          )}
        </div>
      )}

      <button type="submit" className={styles.submitButton}>
        💼 Сохранить билет
      </button>
    </form>
  );
};

export default AddFlightForm;