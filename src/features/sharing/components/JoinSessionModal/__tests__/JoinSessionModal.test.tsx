import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import JoinSessionModal from '../JoinSessionModal';

describe('JoinSessionModal', () => {
  it('keeps the window open when joining fails', async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();

    render(<JoinSessionModal onJoin={onJoin} onClose={onClose} />);

    await user.type(screen.getByLabelText('Ссылка или токен:'), 'abcdefghijklmnopqrstuv');
    await user.click(screen.getByRole('button', { name: 'Присоединиться' }));

    expect(onJoin).toHaveBeenCalledWith('abcdefghijklmnopqrstuv');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes after a successful join', async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(<JoinSessionModal onJoin={onJoin} onClose={onClose} />);

    await user.type(screen.getByLabelText('Ссылка или токен:'), 'abcdefghijklmnopqrstuv');
    await user.click(screen.getByRole('button', { name: 'Присоединиться' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
