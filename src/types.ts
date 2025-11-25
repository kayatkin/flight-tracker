// src/types.ts
export interface Flight {
  id: string;
  origin: string;
  destination: string;
  type: 'oneWay' | 'roundTrip';
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  departureTime: string; // HH:mm
  arrivalTime: string;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  isDirect: boolean;
  layoverCity?: string;
  layoverDuration?: number; // minutes
  airline: string;
  passengers: 1 | 2 | 3 | 4;
  totalPrice: number;
  dateFound: string; // YYYY-MM-DD
}