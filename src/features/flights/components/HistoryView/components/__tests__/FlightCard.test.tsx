import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Flight } from '@shared/types';
import { FlightCard } from '../FlightCard';

const flight: Flight = {
  id: '1',
  origin: 'Москва',
  destination: 'Сочи',
  type: 'roundTrip',
  departureDate: '2026-07-12',
  returnDate: '2026-07-20',
  departureTime: '09:40',
  arrivalTime: '12:05',
  isDirectThere: true,
  isDirectBack: true,
  airline: 'Аэрофлот',
  passengers: 2,
  totalPrice: 24800,
  dateFound: '2026-05-02',
  notes: 'Багаж включён',
};

describe('FlightCard', () => {
  it('shows from/to cities, per-person price and round-trip chip', () => {
    render(
      <FlightCard
        flight={flight}
        isBest
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        canMutate
        isGuest={false}
        guestPermissions="view"
      />
    );

    expect(screen.getByText('Откуда')).toBeInTheDocument();
    expect(screen.getByText('Куда')).toBeInTheDocument();
    expect(screen.getByText('Москва')).toBeInTheDocument();
    expect(screen.getByText('Сочи')).toBeInTheDocument();
    expect(screen.getByText('(туда-обратно)')).toBeInTheDocument();
    expect(screen.getByText(/на человека/)).toBeInTheDocument();
    expect(screen.getByText(/Всего:/)).toBeInTheDocument();
    expect(screen.getByText('Багаж включён')).toBeInTheDocument();
  });
});
