import { t } from '@shared/i18n';

export const NOTES_MAX_LENGTH = 500;

export const validateFlightForm = (
    formData: {
      origin: string;
      destination: string;
      type: 'oneWay' | 'roundTrip';
      departureDate: string;
      returnDate: string;
      totalPrice: string;
      airline?: string;
      notes?: string;
    }
  ): string[] => {
    const errors: string[] = [];
    const origin = (formData.origin ?? '').trim();
    const destination = (formData.destination ?? '').trim();
  
    if (!origin || !destination) {
      errors.push(t('form.cities'));
    }
    
    if (!formData.departureDate) {
      errors.push(t('form.departureDate'));
    }
  
    if (formData.type === 'roundTrip' && !(formData.returnDate ?? '').trim()) {
      errors.push(t('form.returnDate'));
    }

    if (formData.airline !== undefined && !formData.airline.trim()) {
      errors.push(t('form.airline'));
    }
  
    const priceNum = Number(formData.totalPrice);
    if (!(formData.totalPrice ?? '').trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
      errors.push(t('form.price'));
    }

    if ((formData.notes ?? '').length > NOTES_MAX_LENGTH) {
      errors.push(t('form.notesTooLong', { max: NOTES_MAX_LENGTH }));
    }
  
    return errors;
  };
  
  export const validateRoundTripDates = (
    departureDate: string,
    arrivalTime: string,
    arrivalNextDay: boolean,
    returnDate: string,
    returnDepartureTime: string
  ): boolean => {
    try {
      const arrivalDateTime = new Date(`${departureDate}T${arrivalTime || '00:00'}`);
      
      if (arrivalNextDay) {
        arrivalDateTime.setDate(arrivalDateTime.getDate() + 1);
      }
      
      const returnDepartureDateTime = new Date(`${returnDate}T${returnDepartureTime || '00:00'}`);
      
      return returnDepartureDateTime > arrivalDateTime;
    } catch {
      return false;
    }
  };