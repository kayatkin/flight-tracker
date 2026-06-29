import { renderHook } from '@testing-library/react';
import { useFlightForm } from '../useFlightForm';
import { isValidUUID } from '../../utils/id';

describe('useFlightForm', () => {
  it('creates flights with stable database-safe UUIDs', () => {
    const { result } = renderHook(() => useFlightForm('2026-06-29'));

    const flight = result.current.createFlightObject();

    expect(isValidUUID(flight.id)).toBe(true);
  });
});
