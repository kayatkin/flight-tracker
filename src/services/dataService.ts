// src/services/dataService.ts
import { supabase } from '../lib/supabaseClient';
import { Flight } from '../shared/types/types';
import { GuestUser } from '../types/shared';

// Интерфейсы для ответов
export interface LoadUserDataResult {
  flights: Flight[];
  airlines: string[];
  originCities: string[];
  destinationCities: string[];
}

// Общая функция для генерации UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Функция для проверки валидности UUID
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Функция для валидации токена совместного доступа
export const validateToken = async (token: string): Promise<GuestUser | null> => {
  try {
    console.log('[TOKEN] Validating token:', token);
    
    const { data: session, error } = await supabase
      .from('shared_sessions')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('[TOKEN] Validation error:', error);
      return null;
    }

    if (!session) {
      console.log('[TOKEN] No active session found for token');
      return null;
    }

    console.log('[TOKEN] Session found:', {
      owner_id: session.owner_id,
      permissions: session.permissions,
      expires_at: session.expires_at
    });

    let ownerName = 'Владельца';
    if (session.owner_id) {
      ownerName = `Пользователь ${session.owner_id.substring(0, 8)}`;
    }

    return {
      userId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: 'Гость',
      isGuest: true,
      sessionToken: token,
      permissions: session.permissions || 'read',
      ownerId: session.owner_id,
      ownerName: ownerName
    };
  } catch (err) {
    console.error('[TOKEN] Validation crashed:', err);
    return null;
  }
};

// Функция для загрузки данных пользователя/владельца
export const loadUserData = async (targetUserId: string): Promise<LoadUserDataResult> => {
  try {
    console.log('[LOAD] Loading data for user_id:', targetUserId);
    
    const { data: flightRecords, error } = await supabase
      .from('user_flights')
      .select('*')
      .eq('user_id', targetUserId)
      .order('departure_date', { ascending: true });
    
    if (error) {
      console.error('[LOAD] Error loading flights:', error);
      return { flights: [], airlines: [], originCities: [], destinationCities: [] };
    }
    
    if (flightRecords && flightRecords.length > 0) {
      console.log('[LOAD] Found', flightRecords.length, 'flight records');
      
      // Преобразуем записи из базы в объекты Flight
      const flights: Flight[] = flightRecords.map(record => {
        const flight: Flight = {
          id: record.flight_id || generateUUID(), // ← ИСПРАВЛЕНО: убрано this.
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
      
      console.log('[LOAD] Data converted:', {
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
      console.log('[LOAD] No data found for this user');
      return { flights: [], airlines: [], originCities: [], destinationCities: [] };
    }
  } catch (err) {
    console.error('[LOAD] Load crashed:', err);
    return { flights: [], airlines: [], originCities: [], destinationCities: [] };
  }
};

// Функция для сохранения данных владельца
export const saveOwnerData = async (
  userId: string,
  flights: Flight[],
  airlines: string[],
  originCities: string[],
  destinationCities: string[]
): Promise<void> => {
  try {
    console.log('[SAVE] Saving owner data for:', userId, 'flights:', flights.length);
    
    // Если нет рейсов - просто выходим
    if (flights.length === 0) {
      console.log('[SAVE] No flights to save');
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
        console.log(`[SAVE] Generated UUID for flight: ${flightId} (was: ${flight.id})`);
      }
      
      // Для каждого рейса создаем запись в таблице user_flights
      const record = {
        flight_id: flightId, // ← ТЕПЕРЬ UUID, а не число
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
    
    // Логирование для отладки
    console.log('[SAVE DEBUG] Records to insert:', {
      count: records.length,
      firstRecordFlightId: records[0]?.flight_id,
      flightIdType: typeof records[0]?.flight_id,
      isValidUUID: records[0]?.flight_id ? isValidUUID(records[0].flight_id) : false
    });
    
    // Удаляем старые рейсы пользователя
    const { error: deleteError } = await supabase
      .from('user_flights')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) {
      console.warn('[SAVE] Delete old flights warning:', deleteError);
      // Продолжаем несмотря на ошибку
    }
    
    // Сохраняем новые рейсы
    const { error: insertError } = await supabase
      .from('user_flights')
      .insert(records);
    
    if (insertError) {
      console.error('[SAVE] Insert flights error:', insertError);
      console.error('[SAVE] Error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      throw insertError;
    }
    
    console.log('[SAVE] Saved', records.length, 'flight records');
    console.log('[SAVE] Owner data saved successfully');
  } catch (err) {
    console.error('[SAVE] Save owner data failed:', err);
    throw err;
  }
};

// Функция для сохранения данных гостя
export const saveGuestData = async (
  ownerId: string,
  flights: Flight[]
): Promise<void> => {
  try {
    console.log('[SAVE] Saving guest data to owner:', ownerId);
    
    // Для гостя просто сохраняем рейсы
    await saveOwnerData(ownerId, flights, [], [], []);
    
    console.log('[SAVE] Guest data saved to owner');
  } catch (err) {
    console.error('[SAVE] Save guest data failed:', err);
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
    let stats = {
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
    console.error('Error getting session stats:', err);
    return { total: 0, active: 0, expired: 0, revoked: 0 };
  }
};