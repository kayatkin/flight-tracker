// src/shared/lib/i18n/pluralize.ts

export type PluralForm = 'one' | 'few' | 'many';

/**
 * Определяет форму множественного числа для русского языка
 */
export const getPluralForm = (count: number): PluralForm => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'few';
  return 'many';
};

/**
 * Склоняет слово по числу (без вставки числа в текст)
 */
export const pluralize = (
  count: number,
  forms: Record<PluralForm, string>
): string => {
  const form = getPluralForm(count);
  return forms[form];
};

/**
 * Форматирует фразу с числом и склоненным словом (с вставкой числа)
 */
export const pluralizeWithCount = (
  count: number,
  forms: Record<PluralForm, string>
): string => {
  const word = pluralize(count, forms);
  return word.replace('{{count}}', count.toString());
};

/**
 * Упрощенная версия для дней
 */
export const getDaysText = (days: number): string => {
  const forms: Record<PluralForm, string> = {
    one: 'день',
    few: 'дня', 
    many: 'дней'
  };
  
  return `${days} ${pluralize(days, forms)}`;
};