import { useEffect, useRef } from 'react';

export const useEscapeToClose = <T extends HTMLElement>(
  onClose: () => void,
  active = true
) => {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;

    ref.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, active]);

  return ref;
};
