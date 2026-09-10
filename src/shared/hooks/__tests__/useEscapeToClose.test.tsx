import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEscapeToClose } from '../useEscapeToClose';

const Fixture = ({ onClose }: { onClose: () => void }) => {
  const ref = useEscapeToClose<HTMLDivElement>(onClose);
  return (
    <div id="root">
      <button type="button">Outside</button>
      <div ref={ref} role="dialog" tabIndex={-1} aria-label="Диалог">
        <button type="button">First</button>
        <button type="button">Last</button>
      </div>
    </div>
  );
};

describe('useEscapeToClose', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<Fixture onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Fixture onClose={() => undefined} />);
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    last.focus();
    await user.tab();
    expect(first).toHaveFocus();
  });
});
