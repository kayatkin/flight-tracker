// src/components/AddFlightForm.tsx
import React, { useState, useEffect } from 'react';
import { Flight } from '../types';

interface AddFlightFormProps {
  flights: Flight[];
  onAdd: (flight: Flight) => void;
}

const AddFlightForm: React.FC<AddFlightFormProps> = ({ flights, onAdd }) => {
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
    isDirect: true,
    layoverCity: '',
    layoverDuration: 60,
    airline: '',
    passengers: 1 as 1 | 2 | 3 | 4,
    totalPrice: 0,
  });

  const [analysis, setAnalysis] = useState<{
    type: 'good' | 'neutral' | 'bad';
    message: string;
    diff?: number;
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? Number(value) : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, isDirect: e.target.checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!formData.origin || !formData.destination) {
      alert('Укажите города вылета и назначения');
      return;
    }
    if (!formData.departureDate || !formData.departureTime || !formData.arrivalTime) {
      alert('Укажите дату и время вылета/прилёта');
      return;
    }
    if (formData.type === 'roundTrip' && (!formData.returnDate || !formData.returnDepartureTime || !formData.returnArrivalTime)) {
      alert('Укажите дату и время обратного рейса');
      return;
    }
    if (formData.totalPrice <= 0) {
      alert('Укажите корректную стоимость');
      return;
    }

    const newFlight: Flight = {
      id: Date.now().toString(),
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
      type: formData.type,
      departureDate: formData.departureDate,
      returnDate: formData.type === 'roundTrip' ? formData.returnDate : undefined,
      departureTime: formData.departureTime,
      arrivalTime: formData.arrivalTime,
      returnDepartureTime: formData.type === 'roundTrip' ? formData.returnDepartureTime : undefined,
      returnArrivalTime: formData.type === 'roundTrip' ? formData.returnArrivalTime : undefined,
      isDirect: formData.isDirect,
      layoverCity: formData.isDirect ? undefined : formData.layoverCity.trim() || undefined,
      layoverDuration: formData.isDirect ? undefined : formData.layoverDuration,
      airline: formData.airline.trim(),
      passengers: formData.passengers,
      totalPrice: formData.totalPrice,
      dateFound: new Date().toISOString().split('T')[0],
    };

    // Анализ выгоды
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

    // Опционально: очистить форму или показать "сохранено"
    setTimeout(() => setAnalysis(null), 5000);
  };

  // Убедимся, что при смене типа рейса очищаются обратные поля
  useEffect(() => {
    if (formData.type === 'oneWay') {
      setFormData((prev) => ({
        ...prev,
        returnDate: '',
        returnDepartureTime: '',
        returnArrivalTime: '',
      }));
    }
  }, [formData.type]);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Города */}
      <div>
        <label>Город вылета</label>
        <input
          type="text"
          name="origin"
          value={formData.origin}
          onChange={handleChange}
          placeholder="Москва"
          required
        />
      </div>

      <div>
        <label>Город назначения</label>
        <input
          type="text"
          name="destination"
          value={formData.destination}
          onChange={handleChange}
          placeholder="Тбилиси"
          required
        />
      </div>

      {/* Тип рейса */}
      <div>
        <label>
          <input
            type="radio"
            name="type"
            checked={formData.type === 'oneWay'}
            onChange={() => setFormData((prev) => ({ ...prev, type: 'oneWay' }))}
          />
          Только туда
        </label>
        <label style={{ marginLeft: '16px' }}>
          <input
            type="radio"
            name="type"
            checked={formData.type === 'roundTrip'}
            onChange={() => setFormData((prev) => ({ ...prev, type: 'roundTrip' }))}
          />
          Туда и обратно
        </label>
      </div>

      {/* Дата вылета */}
      <div>
        <label>Дата вылета</label>
        <input
          type="date"
          name="departureDate"
          value={formData.departureDate}
          onChange={handleChange}
          min={today}
          required
        />
      </div>

      {/* Время вылета/прилёта туда */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <label>Вылет (время)</label>
          <input
            type="time"
            name="departureTime"
            value={formData.departureTime}
            onChange={handleChange}
            required
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Прилёт (время)</label>
          <input
            type="time"
            name="arrivalTime"
            value={formData.arrivalTime}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* Обратно (если нужно) */}
      {formData.type === 'roundTrip' && (
        <>
          <div>
            <label>Дата возвращения</label>
            <input
              type="date"
              name="returnDate"
              value={formData.returnDate}
              onChange={handleChange}
              min={formData.departureDate}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label>Обратный вылет</label>
              <input
                type="time"
                name="returnDepartureTime"
                value={formData.returnDepartureTime || ''}
                onChange={handleChange}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Обратный прилёт</label>
              <input
                type="time"
                name="returnArrivalTime"
                value={formData.returnArrivalTime || ''}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </>
      )}

      {/* Прямой рейс */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.isDirect}
            onChange={handleCheckbox}
          />
          Прямой рейс
        </label>
      </div>

      {!formData.isDirect && (
        <>
          <div>
            <label>Город пересадки</label>
            <input
              type="text"
              name="layoverCity"
              value={formData.layoverCity}
              onChange={handleChange}
              placeholder="Стамбул"
            />
          </div>
          <div>
            <label>Длительность пересадки (мин)</label>
            <input
              type="number"
              name="layoverDuration"
              value={formData.layoverDuration}
              onChange={handleChange}
              min="30"
              max="1440"
            />
          </div>
        </>
      )}

      {/* Авиакомпания и пассажиры */}
      <div>
        <label>Авиакомпания</label>
        <input
          type="text"
          name="airline"
          value={formData.airline}
          onChange={handleChange}
          placeholder="Aeroflot"
          required
        />
      </div>

      <div>
        <label>Пассажиров</label>
        <select name="passengers" value={formData.passengers} onChange={handleChange as any}>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </div>

      <div>
        <label>Стоимость (всего, ₽)</label>
        <input
          type="number"
          name="totalPrice"
          value={formData.totalPrice}
          onChange={handleChange}
          min="1"
          required
        />
      </div>

      {/* Анализ */}
      {analysis && (
        <div
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor:
              analysis.type === 'good'
                ? '#e6ffe6'
                : analysis.type === 'neutral'
                ? '#fff8e1'
                : '#ffe6e6',
            border:
              analysis.type === 'good'
                ? '1px solid #4caf50'
                : analysis.type === 'neutral'
                ? '1px solid #ff9800'
                : '1px solid #f44336',
          }}
        >
          <strong>{analysis.message}</strong>
          {analysis.diff !== undefined && (
            <div style={{ fontSize: '14px', marginTop: '4px' }}>
              Разница: {analysis.diff > 0 ? '+' : ''}{analysis.diff} ₽
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        style={{
          padding: '12px',
          backgroundColor: '#0088cc',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        Сохранить билет
      </button>
    </form>
  );
};

export default AddFlightForm;