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
  // ← Убираем isDirect, layoverCity, layoverDuration
  isDirectThere: boolean;            // туда
  isDirectBack: boolean;             // обратно (только для roundTrip)
  layoverCityThere?: string;         // пересадка туда
  layoverDurationThere?: number;     // длительность туда (мин)
  layoverCityBack?: string;          // пересадка обратно
  layoverDurationBack?: number;      // длительность обратно (мин)
  airline: string;
  passengers: 1 | 2 | 3 | 4;
  totalPrice: number;
  dateFound: string;
  // ➕ Новые поля для сдвига даты прилёта
  arrivalNextDay?: boolean;          // +1 день к прилёту туда
  returnArrivalNextDay?: boolean;    // +1 день к прилёту обратно
}