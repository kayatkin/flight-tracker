const TABBABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getTabbableElements(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)].filter(
    (element) =>
      element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true'
  );
}

export function wrapTab(event: KeyboardEvent, root: HTMLElement): void {
  if (event.key !== 'Tab') return;

  const items = getTabbableElements(root);
  if (items.length === 0) {
    event.preventDefault();
    root.focus();
    return;
  }

  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || !root.contains(active)) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (active === last || !root.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}

export function applyInertOutside(dialog: HTMLElement): () => void {
  const root = document.getElementById('root') ?? document.body;
  const inerted: HTMLElement[] = [];

  const setInert = (element: HTMLElement, value: boolean) => {
    element.inert = value;
    if (value) {
      element.setAttribute('inert', '');
    } else {
      element.removeAttribute('inert');
    }
  };

  const visit = (parent: HTMLElement) => {
    for (const child of Array.from(parent.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.contains(dialog)) {
        if (child !== dialog) visit(child);
        continue;
      }
      if (!child.hasAttribute('inert') && !child.inert) {
        setInert(child, true);
        inerted.push(child);
      }
    }
  };

  visit(root);
  return () => {
    inerted.forEach((element) => setInert(element, false));
  };
}
