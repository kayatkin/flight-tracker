// src/services/dataService.ts
import { supabase } from '../lib/supabaseClient';
import { Flight } from '../types';
import { GuestUser } from '../types/shared';

// Интерфейсы для ответов
export interface LoadUserDataResult {
  flights: Flight[];
  airlines: string[];
  originCities: string[];
  destinationCities: string[];
}

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

    // Получаем имя владельца из его данных
    const { data: ownerData } = await supabase
      .from('flights')
      .select('*')
      .eq('user_id', session.owner_id)
      .maybeSingle();

    let ownerName = 'Владельца';
    if (ownerData) {
      ownerName = `Пользователь ${session.owner_id.substring(0, 8)}`;
    }

    return {
      userId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: 'Гость',
      isGuest: true,
      sessionToken: token,
      permissions: session.permissions,
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
    
    const { data, error } = await supabase
      .from('flights')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('[LOAD] Error:', error);
      return { flights: [], airlines: [], originCities: [], destinationCities: [] };
    }
    
    if (data) {
      console.log('[LOAD] Data loaded:', {
        flights: data.flights?.length || 0,
        airlines: data.airlines?.length || 0
      });
      return {
        flights: data.flights || [],
        airlines: data.airlines || [],
        originCities: data.origin_cities || [],
        destinationCities: data.destination_cities || []
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
    console.log('[SAVE] Saving owner data for:', userId);
    
    const { error } = await supabase.from('flights').upsert(
      {
        user_id: userId,
        flights: flights,
        airlines: airlines,
        origin_cities: originCities,
        destination_cities: destinationCities,
        updated_at: new Date().toISOString(),
      },
      { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      }
    );
    
    if (error) {
      console.error('[SAVE] Owner save error:', error);
      throw error;
    }
    
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
    
    // Получаем текущие данные владельца
    const { data: currentData } = await supabase
      .from('flights')
      .select('*')
      .eq('user_id', ownerId)
      .maybeSingle();
    
    if (!currentData) {
      console.error('[SAVE] Owner data not found');
      throw new Error('Owner data not found');
    }
    
    // Обновляем только рейсы
    const { error } = await supabase
      .from('flights')
      .update({
        flights: flights,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', ownerId);
    
    if (error) {
      console.error('[SAVE] Guest update error:', error);
      throw error;
    }
    
    console.log('[SAVE] Guest data saved to owner');
  } catch (err) {
    console.error('[SAVE] Save guest data failed:', err);
    throw err;
  }
};