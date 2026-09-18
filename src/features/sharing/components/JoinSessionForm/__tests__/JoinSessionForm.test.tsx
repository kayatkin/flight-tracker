import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import JoinSessionForm from '../JoinSessionForm';

describe('JoinSessionForm', () => {
  it('extracts a token from a pasted web link and stays open on failure', async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn().mockResolvedValue(false);
    const onCancel = vi.fn();

    render(<JoinSessionForm onJoin={onJoin} onCancel={onCancel} />);

    await user.type(
      screen.getByLabelText('Ссылка или токен:'),
      'https://kayatkin.github.io/flight-tracker/?token=abc123token9'
    );
    await user.click(screen.getByRole('button', { name: 'Присоединиться' }));

    expect(onJoin).toHaveBeenCalledWith('abc123token9');
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось присоединиться');
    expect(screen.getByRole('button', { name: 'Присоединиться' })).toBeEnabled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('extracts a Telegram startapp link', async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn().mockResolvedValue(true);

    render(<JoinSessionForm onJoin={onJoin} onCancel={vi.fn()} />);

    await user.type(
      screen.getByLabelText('Ссылка или токен:'),
      'https://t.me/flight_tracker_bot?startapp=editToken99'
    );
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Присоединиться' }));

    expect(onJoin).toHaveBeenCalledWith('editToken99');
  });

  it('does not send a random URL as a token', async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn();

    render(<JoinSessionForm onJoin={onJoin} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Ссылка или токен:'), 'https://example.com/flight-tracker/');
    await user.click(screen.getByRole('button', { name: 'Присоединиться' }));

    expect(onJoin).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Некорректный формат');
  });
});
