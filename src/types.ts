// src/types.ts
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
  // Новые поля для совместного доступа
  owner_id?: string; // ID владельца
  shared_with?: string[]; // Список пользователей с доступом
}