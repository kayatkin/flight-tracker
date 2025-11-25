// src/components/AddFlightForm.tsx
import React, { useState, useEffect } from 'react';
import { Flight } from '../types';

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

      {/* Пересадки */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>🔄 Пересадки</h4>

        {/* Туда */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input
              type="checkbox"
              id="isDirectThere"
              checked={formData.isDirectThere}
              onChange={(e) => setFormData(prev => ({ ...prev, isDirectThere: e.target.checked }))}
              style={{ width: '20px', height: '20px' }}
            />
            <label htmlFor="isDirectThere" style={{ fontWeight: 'bold' }}>
              Прямой рейс туда
            </label>
          </div>
          {!formData.isDirectThere && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Город пересадки (туда)</label>
                <input
                  type="text"
                  value={formData.layoverCityThere || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, layoverCityThere: e.target.value }))}
                  placeholder="Стамбул"
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Длительность (мин)</label>
                <input
                  type="number"
                  value={formData.layoverDurationThere || 60}
                  onChange={(e) => setFormData(prev => ({ ...prev, layoverDurationThere: Number(e.target.value) || 60 }))}
                  min="30"
                  max="1440"
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Обратно (только для roundTrip) */}
        {formData.type === 'roundTrip' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                id="isDirectBack"
                checked={formData.isDirectBack}
                onChange={(e) => setFormData(prev => ({ ...prev, isDirectBack: e.target.checked }))}
                style={{ width: '20px', height: '20px' }}
              />
              <label htmlFor="isDirectBack" style={{ fontWeight: 'bold' }}>
                Прямой рейс обратно
              </label>
            </div>
            {!formData.isDirectBack && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Город пересадки (обратно)</label>
                  <input
                    type="text"
                    value={formData.layoverCityBack || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, layoverCityBack: e.target.value }))}
                    placeholder="Доха"
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Длительность (мин)</label>
                  <input
                    type="number"
                    value={formData.layoverDurationBack || 60}
                    onChange={(e) => setFormData(prev => ({ ...prev, layoverDurationBack: Number(e.target.value) || 60 }))}
                    min="30"
                    max="1440"
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Авиакомпания с автозаполнением */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>✈️ Авиакомпания</h4>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            name="airline"
            value={formData.airline}
            onChange={handleChange}
            placeholder="Начните вводить..."
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '16px',
            }}
            autoComplete="off"
          />
          {formData.airline && suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '6px',
                marginTop: '4px',
                maxHeight: '150px',
                overflowY: 'auto',
                zIndex: 10,
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              }}
            >
              {suggestions.map((airline, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, airline }));
                    setSuggestions([]);
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f8ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                >
                  {airline}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Пассажиры */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>👥 Пассажиры</h4>
        <div>
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
            type="text"
            name="totalPrice"
            value={formData.totalPrice}
            onChange={handleChange}
            placeholder="12500"
            inputMode="numeric"
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