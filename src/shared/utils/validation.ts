// src/utils/validation.ts
export const validateFlightForm = (
    formData: {
      origin: string;
      destination: string;
      type: 'oneWay' | 'roundTrip';
      departureDate: string;
      returnDate: string;
      totalPrice: string;
      airline?: string;
    }
  ): string[] => {
    const errors: string[] = [];
    const origin = (formData.origin ?? '').trim();
    const destination = (formData.destination ?? '').trim();
  
    if (!origin || !destination) {
      errors.push('Укажите города вылета и назначения');
    }
    
    if (!formData.departureDate) {
      errors.push('Укажите дату вылета');
    }
  
    if (formData.type === 'roundTrip' && !(formData.returnDate ?? '').trim()) {
      errors.push('Укажите дату возвращения');
    }

    if (formData.airline !== undefined && !formData.airline.trim()) {
      errors.push('Укажите авиакомпанию');
    }
  
    const priceNum = Number(formData.totalPrice);
    if (!(formData.totalPrice ?? '').trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
      errors.push('Укажите корректную стоимость (только цифры, больше 0)');
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