import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Flight } from '@shared/types';

vi.mock('@shared/ui/Toast', () => ({ toast: vi.fn() }));
vi.mock('@services/cbrUsd', () => ({
  loadUsdRubRates: vi.fn(async () => new Map()),
}));

import AddFlightForm from '../AddFlightForm';

const flight: Flight = {
  id: '11111111-1111-4111-8111-111111111111',
  origin: 'Кемерово',
  destination: 'Москва',
  type: 'roundTrip',
  departureDate: '2026-04-11',
  returnDate: '2026-04-13',
  departureTime: '08:10',
  arrivalTime: '08:50',
  isDirectThere: true,
  isDirectBack: true,
  airline: 'Аэрофлот',
  passengers: 1,
  totalPrice: 18237,
  dateFound: '2026-11-09',
};

describe('AddFlightForm edit suggestions', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show city or airline chips when opening a saved ticket', () => {
    render(
      <AddFlightForm
        flights={[flight]}
        airlines={['Аэрофлот', 'S7']}
        originCities={['Кемерово', 'Москва']}
        destinationCities={['Кемерово', 'Москва']}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        editingFlight={flight}
      />
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Кемерово' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Москва' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Аэрофлот' })).not.toBeInTheDocument();
  });

  it('shows other city matches after the user starts typing', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();

    render(
      <AddFlightForm
        flights={[flight]}
        airlines={['Аэрофлот']}
        originCities={['Кемерово', 'Кемерово-2']}
        destinationCities={['Москва']}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        editingFlight={flight}
      />
    );

    const origin = screen.getByLabelText('Город вылета');
    await user.clear(origin);
    await user.type(origin, 'Кем');

    expect(await screen.findByRole('option', { name: 'Кемерово' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Кемерово-2' })).toBeInTheDocument();
  });
});
