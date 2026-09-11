// src/services/dataService.ts
import { supabase } from '@shared/lib';
import { Flight } from '../shared/types/types';
import { generateUUID, isValidUUID } from '../shared/utils/id';
import { toLocalISODate } from '../shared/utils/date';
import { devLog, logError } from '../shared/utils/logger';

export interface SaveOwnerDataOptions {
  /** IDs known to this client; only these may be pruned when missing locally. */
  knownFlightIds?: string[];
}

export interface LoadUserDataResult {
  flights: Flight[];
  airlines: string[];
  originCities: string[];
  destinationCities: string[];
  ok: boolean;
}

const flightToRecord = (userId: string, flight: Flight) => {
  let flightId = flight.id;
  if (!flightId || !isValidUUID(flightId)) {
    flightId = generateUUID();
    devLog(`[SAVE] Generated UUID for flight: ${flightId} (was: ${flight.id})`);
  }

  return {
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
    notes: flight.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
};

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
      return { flights: [], airlines: [], originCities: [], destinationCities: [], ok: false };
    }

    if (flightRecords && flightRecords.length > 0) {
      devLog('[LOAD] Found', flightRecords.length, 'flight records');

      const flights: Flight[] = flightRecords.map((record) => {
        const flight: Flight = {
          id: record.flight_id || generateUUID(),
          origin: record.origin || '',
          destination: record.destination || '',
          type: (record.flight_type as 'oneWay' | 'roundTrip'),
          departureDate: record.departure_date || toLocalISODate(),
          isDirectThere: record.is_direct_there || false,
          isDirectBack: record.is_direct_back || false,
          airline: record.airline || 'Unknown',
          passengers: (Math.min(Math.max(record.passengers || 1, 1), 4) as 1 | 2 | 3 | 4),
          totalPrice: record.total_price || 0,
          dateFound: record.date_found || toLocalISODate(),
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
          notes: record.notes || undefined,
        };

        return flight;
      });

      const airlines: string[] = [];
      const originCities: string[] = [];
      const destinationCities: string[] = [];

      flights.forEach((flight) => {
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
        destinationCities: destinationCities.length,
      });

      return {
        flights,
        airlines,
        originCities,
        destinationCities,
        ok: true,
      };
    }

    devLog('[LOAD] No data found for this user');
    return { flights: [], airlines: [], originCities: [], destinationCities: [], ok: true };
  } catch (err) {
    logError('[LOAD] Load crashed:', err);
    return { flights: [], airlines: [], originCities: [], destinationCities: [], ok: false };
  }
};

/** Upsert only the given rows and delete the given ids. No-op if both are empty. */
export const persistFlightChanges = async (
  userId: string,
  upserts: Flight[],
  deleteIds: string[] = []
): Promise<void> => {
  const uniqueDeletes = [...new Set(deleteIds.filter(Boolean))];
  if (upserts.length === 0 && uniqueDeletes.length === 0) {
    return;
  }

  if (upserts.length > 0) {
    const records = upserts.map((flight) => flightToRecord(userId, flight));
    devLog('[SAVE] Upserting records:', records.length);
    const { error: upsertError } = await supabase
      .from('user_flights')
      .upsert(records, { onConflict: 'flight_id' });

    if (upsertError) {
      logError('[SAVE] Upsert flights error:', upsertError);
      throw upsertError;
    }
  }

  if (uniqueDeletes.length > 0) {
    const { error: deleteError } = await supabase
      .from('user_flights')
      .delete()
      .eq('user_id', userId)
      .in('flight_id', uniqueDeletes);

    if (deleteError) {
      logError('[SAVE] Delete flights error:', deleteError);
      throw deleteError;
    }
  }
};

export const saveOwnerData = async (
  userId: string,
  flights: Flight[],
  _airlines: string[] = [],
  _originCities: string[] = [],
  _destinationCities: string[] = [],
  options: SaveOwnerDataOptions = {}
): Promise<void> => {
  try {
    devLog('[SAVE] Saving owner data for:', userId, 'flights:', flights.length);
    const knownFlightIds = options.knownFlightIds;
    const currentIds = flights
      .map((flight) => (flight.id && isValidUUID(flight.id) ? flight.id : null))
      .filter((id): id is string => Boolean(id));
    const idsToDelete = (knownFlightIds ?? []).filter((id) => !currentIds.includes(id));

    if (flights.length === 0 && (!knownFlightIds || knownFlightIds.length === 0)) {
      devLog('[SAVE] Skip clearing flights: empty snapshot without known ids');
      return;
    }

    await persistFlightChanges(userId, flights, idsToDelete);
    devLog('[SAVE] Owner data saved successfully:', flights.length, 'records');
  } catch (err) {
    logError('[SAVE] Save owner data failed:', err);
    throw err;
  }
};

export const saveGuestData = async (
  ownerId: string,
  flights: Flight[],
  options: SaveOwnerDataOptions = {}
): Promise<void> => {
  try {
    devLog('[SAVE] Saving guest data to owner:', ownerId);
    await saveOwnerData(ownerId, flights, [], [], [], options);
    devLog('[SAVE] Guest data saved to owner');
  } catch (err) {
    logError('[SAVE] Save guest data failed:', err);
    throw err;
  }
};
