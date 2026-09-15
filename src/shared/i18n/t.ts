import { getPluralForm } from '@shared/lib/i18n/pluralize';
import { ru, type RuCatalog } from './ru';

type Join<K, P> = K extends string
  ? P extends string
    ? `${K}.${P}`
    : never
  : never;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, Paths<T[K]>>
}[keyof T & string];

export type MessageKey = Paths<RuCatalog>;

const lookup = (key: MessageKey): string => {
  const parts = key.split('.');
  let node: unknown = ru;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null || !(part in node)) {
      return key;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : key;
};

export const t = (key: MessageKey, vars?: Record<string, string | number>): string => {
  let text = lookup(key);
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{{${name}}}`, String(value));
    }
  }
  return text;
};

export const permWord = (permissions: 'view' | 'edit'): string =>
  permissions === 'edit' ? t('guest.permEdit') : t('guest.permView');

export const passengerWord = (count: number): string => {
  if (count === 1) return t('form.passengerOne');
  if (count > 1 && count < 5) return t('form.passengerFew');
  return t('form.passengerMany');
};

export const ticketWord = (count: number): string => {
  const form = getPluralForm(count);
  if (form === 'one') return t('history.ticketOne');
  if (form === 'few') return t('history.ticketFew');
  return t('history.ticketMany');
};

export { ru };
