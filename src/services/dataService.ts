// src/services/dataService.ts
import { supabase } from '../lib/supabaseClient';
import { Flight } from '../shared/types/types';
import { generateUUID, isValidUUID } from '../shared/utils/id';
import { devLog, logError } from '../shared/utils/logger';

// Интерфейсы для ответов
export interface LoadUserDataResult {
  flights: Flight[];
  airlines: string[];
  originCities: string[];
  destinationCities: string[];
}

// 🔥 Новая функция: получение читаемого имени владельца
const getReadableOwnerName = async (ownerId: string): Promise<string> => {
  if (!ownerId) return 'Владельца';
  
  try {
    // Пытаемся получить имя из таблицы users
    const { data: userData, error } = await supabase
      .from('users')
      .select('name')
      .eq('user_id', ownerId)
      .maybeSingle();
    
    if (!error && userData?.name) {
      // Нашли имя в таблице users
      devLog('[TOKEN] Found owner name in users table:', userData.name);
      return userData.name;
    }
    
    // Если не нашли в users, форматируем ID
    if (ownerId.startsWith('tg_')) {
      const numId = ownerId.replace('tg_', '');
      return `Пользователь #${numId.substring(0, Math.min(6, numId.length))}`;
    }
    
    if (ownerId.startsWith('telegram_anon_')) {
      return 'Анонимный пользователь';
    }
    
    if (ownerId === 'dev_user' || ownerId.includes('development')) {
      return 'Разработчик';
    }
    
    // Общий fallback
    return `Пользователь ${ownerId.substring(0, 8)}`;
    
  } catch (err) {
    // Если таблицы users нет или ошибка - используем старую логику
    devLog('[TOKEN] Error getting owner name from users table, using fallback');
    
    if (ownerId.startsWith('tg_')) {
      const numId = ownerId.replace('tg_', '');
      return `Пользователь #${numId.substring(0, 8)}`;
    }
    
    return 'Владелец';
  }
};

// Функция для загрузки данных пользователя/владельца
export const loadUserData = async (targetUserId: string): Promise<LoadUserDataResult> => {
  try {
    devLog('[LOAD] Loading data for user_id:', targetUserId);
    
    const { data: flightRecords, error } = await supabase
      .from('user_flights')
      .select('*')
      .eq('user_id', targetUserId)
      .order('departure_date', { ascending: true });
    
    if (error) {
      logError('[LOAD] Error loading flights:', error);
      return { flights: [], airlines: [], originCities: [], destinationCities: [] };
    }
    
    if (flightRecords && flightRecords.length > 0) {
      devLog('[LOAD] Found', flightRecords.length, 'flight records');
      
      // Преобразуем записи из базы в объекты Flight
      const flights: Flight[] = flightRecords.map(record => {
        const flight: Flight = {
          id: record.flight_id || generateUUID(),
          origin: record.origin || '',
          destination: record.destination || '',
          type: (record.flight_type as 'oneWay' | 'roundTrip'),
          departureDate: record.departure_date || new Date().toISOString().split('T')[0],
          isDirectThere: record.is_direct_there || false,
          isDirectBack: record.is_direct_back || false,
          airline: record.airline || 'Unknown',
          passengers: (Math.min(Math.max(record.passengers || 1, 1), 4) as 1 | 2 | 3 | 4),
          totalPrice: record.total_price || 0,
          dateFound: record.date_found || new Date().toISOString().split('T')[0],
          // Опциональные поля
          returnDate: record.return_date || undefined,
          departureTime: record.departure_time || undefined,
          arrivalTime: record.arrival_time || undefined,
          returnDepartureTime: record.return_departure_time || undefined,
          returnArrivalTime: record.return_arrival_time || undefined,
          layoverCityThere: record.layover_city_there || undefined,
          layoverDurationThere: record.layover_duration_there || undefined,
          layoverCityBack: record.layover_city_back || undefined,
          layoverDurationBack: record.layover_duration_back || undefined,
          arrivalNextDay: record.arrival_next_day || undefined,
          returnArrivalNextDay: record.return_arrival_next_day || undefined,
        };
        
        return flight;
      });
      
      // Исправляем создание массивов (для старых версий TypeScript)
      const airlines: string[] = [];
      const originCities: string[] = [];
      const destinationCities: string[] = [];
      
      flights.forEach(flight => {
        if (flight.airline && flight.airline !== 'Unknown' && !airlines.includes(flight.airline)) {
          airlines.push(flight.airline);
        }
        if (flight.origin && !originCities.includes(flight.origin)) {
          originCities.push(flight.origin);
        }
        if (flight.destination && !destinationCities.includes(flight.destination)) {
          destinationCities.push(flight.destination);
        }
      });
      
      devLog('[LOAD] Data converted:', {
        flights: flights.length,
        airlines: airlines.length,
        originCities: originCities.length,
        destinationCities: destinationCities.length
      });
      
      return {
        flights,
        airlines,
        originCities,
        destinationCities
      };
    } else {
      devLog('[LOAD] No data found for this user');
      return { flights: [], airlines: [], originCities: [], destinationCities: [] };
    }
  } catch (err) {
    logError('[LOAD] Load crashed:', err);
    return { flights: [], airlines: [], originCities: [], destinationCities: [] };
  }
};

// Функция для сохранения данных владельца
export const saveOwnerData = async (
  userId: string,
  flights: Flight[],
  _airlines: string[],
  _originCities: string[],
  _destinationCities: string[]
): Promise<void> => {
  try {
    devLog('[SAVE] Saving owner data for:', userId, 'flights:', flights.length);

    if (flights.length === 0) {
      devLog('[SAVE] No flights to upsert');
      return;
    }
    
    // Преобразуем Flight объекты в записи базы данных
    const records = flights.map(flight => {
      // Генерируем правильный UUID для flight_id
      let flightId = flight.id;
      
      // Проверяем, является ли ID валидным UUID
      if (!flightId || !isValidUUID(flightId)) {
        // Если ID не валидный UUID, генерируем новый
        flightId = generateUUID();
        devLog(`[SAVE] Generated UUID for flight: ${flightId} (was: ${flight.id})`);
      }
      
      // Для каждого рейса создаем запись в таблице user_flights
      const record = {
        flight_id: flightId,
        user_id: userId,
        origin: flight.origin,
        destination: flight.destination,
        flight_type: flight.type,
        departure_date: flight.departureDate,
        return_date: flight.returnDate || null,
        departure_time: flight.departureTime || null,
        arrival_time: flight.arrivalTime || null,
        return_departure_time: flight.returnDepartureTime || null,
        return_arrival_time: flight.returnArrivalTime || null,
        is_direct_there: flight.isDirectThere,
        is_direct_back: flight.isDirectBack,
        layover_city_there: flight.layoverCityThere || null,
        layover_duration_there: flight.layoverDurationThere || null,
        layover_city_back: flight.layoverCityBack || null,
        layover_duration_back: flight.layoverDurationBack || null,
        airline: flight.airline,
        passengers: flight.passengers,
        total_price: flight.totalPrice,
        date_found: flight.dateFound,
        arrival_next_day: flight.arrivalNextDay || false,
        return_arrival_next_day: flight.returnArrivalNextDay || false,
        updated_at: new Date().toISOString(),
      };
      
      return record;
    });
    
    devLog('[SAVE] Upserting records:', records.length);

    const { error: upsertError } = await supabase
      .from('user_flights')
      .upsert(records, { onConflict: 'flight_id' });

    if (upsertError) {
      logError('[SAVE] Upsert flights error:', upsertError);
      throw upsertError;
    }

    devLog('[SAVE] Owner data saved successfully:', records.length, 'records');
  } catch (err) {
    logError('[SAVE] Save owner data failed:', err);
    throw err;
  }
};

export const deleteFlightData = async (userId: string, flightId: string): Promise<void> => {
  try {
    if (!isValidUUID(flightId)) {
      throw new Error(`Invalid flight id for delete: ${flightId}`);
    }

    const { error } = await supabase
      .from('user_flights')
      .delete()
      .eq('user_id', userId)
      .eq('flight_id', flightId);

    if (error) {
      logError('[DELETE] Failed to delete flight:', error);
      throw error;
    }

    devLog('[DELETE] Flight deleted:', flightId);
  } catch (err) {
    logError('[DELETE] Delete flight failed:', err);
    throw err;
  }
};

// Функция для сохранения данных гостя
export const saveGuestData = async (
  ownerId: string,
  flights: Flight[]
): Promise<void> => {
  try {
    devLog('[SAVE] Saving guest data to owner:', ownerId);
    
    // Для гостя просто сохраняем рейсы
    await saveOwnerData(ownerId, flights, [], [], []);
    
    devLog('[SAVE] Guest data saved to owner');
  } catch (err) {
    logError('[SAVE] Save guest data failed:', err);
    throw err;
  }
};

// ДОПОЛНИТЕЛЬНАЯ ФУНКЦИЯ: Получение статистики по приглашениям
export const getSharedSessionsStats = async (ownerId: string) => {
  try {
    const { data, error } = await supabase
      .from('shared_sessions')
      .select('*')
      .eq('owner_id', ownerId);

    if (error) throw error;

    const now = new Date();
    const stats = {
      total: 0,
      active: 0,
      expired: 0,
      revoked: 0
    };

    if (data) {
      stats.total = data.length;
      
      data.forEach(session => {
        if (session.is_active === false) {
          stats.revoked++;
        } else if (new Date(session.expires_at) < now) {
          stats.expired++;
        } else {
          stats.active++;
        }
      });
    }

    return stats;
  } catch (err) {
    logError('Error getting session stats:', err);
    return { total: 0, active: 0, expired: 0, revoked: 0 };
  }
};