// src/components/AddFlightForm.tsx
import React, { useState } from 'react';
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
    setTimeout(() => setAnalysis(null), 5000);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
      
      {/* Города */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>📍 Маршрут</h4>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Город вылета</label>
          <input
            type="text"
            name="origin"
            value={formData.origin}
            onChange={handleChange}
            placeholder="Москва"
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '16px',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Город назначения</label>
          <input
            type="text"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            placeholder="Тбилиси"
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '16px',
            }}
          />
        </div>
      </div>

      {/* Тип рейса */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>✈️ Тип рейса</h4>
        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="radio"
              name="type"
              checked={formData.type === 'oneWay'}
              onChange={() => setFormData((prev) => ({ ...prev, type: 'oneWay' }))}
              style={{ width: '20px', height: '20px' }}
            />
            Только туда
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="radio"
              name="type"
              checked={formData.type === 'roundTrip'}
              onChange={() => setFormData((prev) => ({ ...prev, type: 'roundTrip' }))}
              style={{ width: '20px', height: '20px' }}
            />
            Туда и обратно
          </label>
        </div>
      </div>

      {/* Дата и время */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>📅 Дата и время</h4>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Дата вылета</label>
          <input
            type="date"
            name="departureDate"
            value={formData.departureDate}
            onChange={handleChange}
            min={today}
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '16px',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Вылет (время)</label>
            <input
              type="time"
              name="departureTime"
              value={formData.departureTime}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '16px',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Прилёт (время)</label>
            <input
              type="time"
              name="arrivalTime"
              value={formData.arrivalTime}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '16px',
              }}
            />
          </div>
        </div>

        {formData.type === 'roundTrip' && (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Дата возвращения</label>
              <input
                type="date"
                name="returnDate"
                value={formData.returnDate}
                onChange={handleChange}
                min={formData.departureDate}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '16px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Обратный вылет</label>
                <input
                  type="time"
                  name="returnDepartureTime"
                  value={formData.returnDepartureTime || ''}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '16px',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Обратный прилёт</label>
                <input
                  type="time"
                  name="returnArrivalTime"
                  value={formData.returnArrivalTime || ''}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '16px',
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Прямой рейс / Пересадка */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>🔄 Рейс</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="isDirect"
            checked={formData.isDirect}
            onChange={handleCheckbox}
            style={{ width: '20px', height: '20px' }}
          />
          <label htmlFor="isDirect" style={{ fontWeight: 'bold' }}>Прямой рейс</label>
        </div>

        {!formData.isDirect && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Город пересадки</label>
              <input
                type="text"
                name="layoverCity"
                value={formData.layoverCity}
                onChange={handleChange}
                placeholder="Стамбул"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '16px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Длительность пересадки (мин)</label>
              <input
                type="number"
                name="layoverDuration"
                value={formData.layoverDuration}
                onChange={handleChange}
                min="30"
                max="1440"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '16px',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Авиакомпания и пассажиры */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>🏢 Авиакомпания и пассажиры</h4>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Авиакомпания</label>
          <input
            type="text"
            name="airline"
            value={formData.airline}
            onChange={handleChange}
            placeholder="Aeroflot"
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '16px',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Пассажиров</label>
          <select
            name="passengers"
            value={formData.passengers}
            onChange={handleChange as any}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '16px',
            }}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
      </div>

      {/* Стоимость */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>💰 Стоимость</h4>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Стоимость (всего, ₽)</label>
          <input
            type="number"
            name="totalPrice"
            value={formData.totalPrice}
            onChange={handleChange}
            min="1"
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '16px',
            }}
          />
        </div>
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
            textAlign: 'center',
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

      {/* Кнопка сохранить */}
      <button
        type="submit"
        style={{
          padding: '16px',
          backgroundColor: '#0088cc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginTop: '16px',
        }}
      >
        💼 Сохранить билет
      </button>
    </form>
  );
};

export default AddFlightForm;