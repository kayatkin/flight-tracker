import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@shared/ui/Toast', () => ({ toast: vi.fn() }));
vi.mock('@services/cbrUsd', () => ({
  loadUsdRubRates: vi.fn(async () => new Map()),
}));

import AddFlightForm from '../AddFlightForm';

describe('AddFlightForm', () => {
  it('saves a round-trip whose dates are already in the past', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(
      <AddFlightForm
        flights={[]}
        airlines={['S7']}
        originCities={['Кемерово']}
        destinationCities={['Москва']}
        onAdd={onAdd}
      />
    );

    await user.type(screen.getByLabelText('Город вылета'), 'Кемерово');
    await user.type(screen.getByLabelText('Город назначения'), 'Москва');
    await user.click(screen.getByLabelText('Туда и обратно'));

    fireEvent.change(screen.getByLabelText('Дата вылета'), {
      target: { name: 'departureDate', value: '2026-04-11' },
    });
    fireEvent.change(screen.getByLabelText('Дата возвращения'), {
      target: { name: 'returnDate', value: '2026-04-13' },
    });

    await user.type(screen.getByLabelText('Название авиакомпании'), 'S7');
    await user.type(screen.getByLabelText('Общая стоимость билета в рублях'), '18237');
    await user.click(screen.getByRole('button', { name: 'Сохранить билет' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      origin: 'Кемерово',
      destination: 'Москва',
      type: 'roundTrip',
      departureDate: '2026-04-11',
      returnDate: '2026-04-13',
      airline: 'S7',
      totalPrice: 18237,
    });
  });
});
