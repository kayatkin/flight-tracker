/** Calendar date helpers that ignore UTC offsets. */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

export const parseISODateParts = (iso: string): DateParts | null => {
  const match = ISO_DATE.exec(iso.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
};

/** Today's date in local calendar, `YYYY-MM-DD`. */
export const toLocalISODate = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** 0–11 month index from a stored `YYYY-MM-DD` value. */
export const monthIndexFromISODate = (iso: string): number | null => {
  const parts = parseISODateParts(iso);
  return parts ? parts.month - 1 : null;
};
