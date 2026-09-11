import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

const Boom = (): never => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  it('shows a recovery screen when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось показать приложение');
    expect(screen.getByRole('button', { name: 'Обновить' })).toBeInTheDocument();
    spy.mockRestore();
  });
});
