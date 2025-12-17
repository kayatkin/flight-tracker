// src/types/types.ts - ОБНОВЛЕННАЯ ВЕРСИЯ

// Основной интерфейс перелета
export interface Flight {
  id: string;
  origin: string;
  destination: string;
  type: 'oneWay' | 'roundTrip';
  departureDate: string;
  returnDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  isDirectThere: boolean;
  isDirectBack: boolean;
  layoverCityThere?: string;
  layoverDurationThere?: number;
  layoverCityBack?: string;
  layoverDurationBack?: number;
  airline: string;
  passengers: 1 | 2 | 3 | 4;
  totalPrice: number;
  dateFound: string;
  arrivalNextDay?: boolean;
  returnArrivalNextDay?: boolean;
}

// Тип для данных пользователя в Supabase
export interface UserData {
  user_id: string;
  flights: Flight[];
  airlines: string[];
  origin_cities: string[];
  destination_cities: string[];
  created_at?: string;
  updated_at?: string;
}

// Тип для ответа загрузки данных
export interface UserDataResponse {
  flights: Flight[];
  airlines: string[];
  originCities: string[];
  destinationCities: string[];
}

// Тип для конфигурации пользователя
export interface UserConfig {
  userId: string;
  userName: string;
  isTelegram: boolean;
  isGuest: boolean;
}
