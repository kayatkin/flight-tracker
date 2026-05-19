import { isKnownCity, isValidCityFormat, getCitySuggestions } from '../fieldValidation';

describe('fieldValidation', () => {
  it('validates city format', () => {
    expect(isValidCityFormat('Moscow')).toBe(true);
    expect(isValidCityFormat('A')).toBe(false);
  });

  it('matches known cities', () => {
    expect(isKnownCity('London')).toBe(true);
    expect(isKnownCity('Лондон')).toBe(true);
  });

  it('suggests cities by query', () => {
    const suggestions = getCitySuggestions('mos');
    expect(suggestions.some((s) => s.toLowerCase().includes('mos'))).toBe(true);
  });
});
