import { useEffect, useRef } from 'react';
import { applyInertOutside, wrapTab } from '../utils/focusTrap';

export const useEscapeToClose = <T extends HTMLElement>(
  onClose: () => void,
  active = true
) => {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;

    const dialog = ref.current;
    if (!dialog) return;

    const previous = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    dialog.focus();
    const releaseInert = applyInertOutside(dialog);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      wrapTab(event, dialog);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      releaseInert();
      previous?.focus();
    };
  }, [onClose, active]);

  return ref;
};
