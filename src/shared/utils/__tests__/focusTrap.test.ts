import { describe, expect, it } from 'vitest';
import { applyInertOutside, getTabbableElements, wrapTab } from '../focusTrap';

describe('getTabbableElements', () => {
  it('skips disabled controls and tabindex=-1', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <button type="button">One</button>
      <button type="button" disabled>Nope</button>
      <a href="/x">Link</a>
      <button type="button" tabindex="-1">Skip</button>
    `;
    expect(getTabbableElements(root).map((el) => el.textContent)).toEqual(['One', 'Link']);
  });
});

describe('wrapTab', () => {
  it('cycles from the last control back to the first', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <button type="button" id="first">First</button>
      <button type="button" id="last">Last</button>
    `;
    document.body.append(root);
    const last = root.querySelector('#last') as HTMLButtonElement;
    const first = root.querySelector('#first') as HTMLButtonElement;
    last.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    wrapTab(event, root);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
    root.remove();
  });
});

describe('applyInertOutside', () => {
  it('inerts siblings that do not contain the dialog', () => {
    const root = document.createElement('div');
    root.id = 'root';
    root.innerHTML = `
      <header>Header</header>
      <main>
        <p>Background</p>
        <div role="dialog">Dialog</div>
      </main>
    `;
    document.body.append(root);
    const dialog = root.querySelector('[role="dialog"]') as HTMLElement;
    const release = applyInertOutside(dialog);

    expect((root.querySelector('header') as HTMLElement).hasAttribute('inert')).toBe(true);
    expect((root.querySelector('p') as HTMLElement).hasAttribute('inert')).toBe(true);
    expect(dialog.hasAttribute('inert')).toBe(false);

    release();
    expect((root.querySelector('header') as HTMLElement).hasAttribute('inert')).toBe(false);
    root.remove();
  });
});
