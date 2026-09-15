import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Flight } from '@shared/types';
import { SearchBar } from '../SearchBar';

vi.mock('@shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/utils')>();
  return {
    ...actual,
    downloadFlightsCsv: vi.fn(),
  };
});

const makeFlight = (id: string): Flight => ({
  id,
  origin: 'Moscow',
  destination: 'Istanbul',
  type: 'oneWay',
  departureDate: '2026-06-15',
  isDirectThere: true,
  isDirectBack: false,
  airline: 'SU',
  passengers: 1,
  totalPrice: 10000,
  dateFound: '2026-05-01',
});

const flights = (count: number): Flight[] =>
  Array.from({ length: count }, (_, index) => makeFlight(String(index + 1)));

const renderBar = (overrides: Partial<Parameters<typeof SearchBar>[0]> = {}) => {
  const visible = overrides.visibleFlights ?? flights(2);
  return render(
    <SearchBar
      searchTerm=""
      onSearchChange={vi.fn()}
      sort="route"
      onSortChange={vi.fn()}
      totalFlights={visible.length}
      visibleFlights={visible}
      {...overrides}
    />
  );
};

describe('SearchBar toolbar', () => {
  it('labels the ticket count and keeps the total tooltip', () => {
    renderBar({ totalFlights: 12, visibleFlights: flights(12) });
    expect(screen.getByTitle('Всего билетов: 12')).toHaveTextContent('12 билетов');
  });

  it('declines the word for 1, 2, 5 and 21', () => {
    const { rerender } = renderBar({ totalFlights: 1, visibleFlights: flights(1) });
    expect(screen.getByTitle('Всего билетов: 1')).toHaveTextContent('1 билет');

    rerender(
      <SearchBar
        searchTerm=""
        onSearchChange={vi.fn()}
        sort="route"
        onSortChange={vi.fn()}
        totalFlights={2}
        visibleFlights={flights(2)}
      />
    );
    expect(screen.getByTitle('Всего билетов: 2')).toHaveTextContent('2 билета');

    rerender(
      <SearchBar
        searchTerm=""
        onSearchChange={vi.fn()}
        sort="route"
        onSortChange={vi.fn()}
        totalFlights={5}
        visibleFlights={flights(5)}
      />
    );
    expect(screen.getByTitle('Всего билетов: 5')).toHaveTextContent('5 билетов');

    rerender(
      <SearchBar
        searchTerm=""
        onSearchChange={vi.fn()}
        sort="route"
        onSortChange={vi.fn()}
        totalFlights={21}
        visibleFlights={flights(21)}
      />
    );
    expect(screen.getByTitle('Всего билетов: 21')).toHaveTextContent('21 билет');
  });

  it('shows a short found count while searching and keeps the found tooltip', () => {
    renderBar({
      searchTerm: 'Стамбул',
      totalFlights: 12,
      visibleFlights: flights(3),
    });
    expect(screen.getByTitle('Найдено 3 из 12')).toHaveTextContent('3 из 12');
  });

  it('marks the CSV button as an export without changing its tooltip', () => {
    renderBar({ totalFlights: 2, visibleFlights: flights(2) });
    const button = screen.getByRole('button', { name: 'Скачать все билеты на экране в CSV' });
    expect(button).toHaveTextContent('⬇️');
    expect(button).toHaveTextContent('CSV');
    expect(button).toHaveAttribute('title', 'Скачать все билеты на экране в CSV');
  });
});
