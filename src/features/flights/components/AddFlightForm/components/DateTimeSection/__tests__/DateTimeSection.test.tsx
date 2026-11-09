import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createEmptyFlightForm } from '@shared/utils';
import DateTimeSection from '../DateTimeSection';

describe('DateTimeSection', () => {
  it('allows past departure dates and keeps return on or after outbound', () => {
    const formData = {
      ...createEmptyFlightForm('2026-11-09'),
      type: 'roundTrip' as const,
      departureDate: '2026-11-09',
    };
    const updateFormData = vi.fn();

    render(<DateTimeSection formData={formData} updateFormData={updateFormData} />);

    const departure = screen.getByLabelText('Дата вылета');
    const returnDate = screen.getByLabelText('Дата возвращения');

    expect(departure).not.toHaveAttribute('min');
    expect(returnDate).toHaveAttribute('min', '2026-11-09');

    fireEvent.change(departure, { target: { name: 'departureDate', value: '2026-04-11' } });
    expect(updateFormData).toHaveBeenCalledWith({ departureDate: '2026-04-11' });
  });

  it('does not pin return date to today when outbound is empty', () => {
    const formData = {
      ...createEmptyFlightForm('2026-11-09'),
      type: 'roundTrip' as const,
      departureDate: '',
    };

    render(<DateTimeSection formData={formData} updateFormData={vi.fn()} />);

    expect(screen.getByLabelText('Дата возвращения')).not.toHaveAttribute('min');
  });
});
