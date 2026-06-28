import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { isValidUUID } from '../utils/id';
import { useFlightForm } from './useFlightForm';

describe('useFlightForm', () => {
  it('creates flights with stable UUID ids', () => {
    const { result } = renderHook(() => useFlightForm('2026-06-28'));

    const flight = result.current.createFlightObject();

    expect(isValidUUID(flight.id)).toBe(true);
  });
});
