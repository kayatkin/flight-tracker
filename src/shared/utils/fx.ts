export const rubToUsd = (rub: number, usdRub: number): number | null => {
  if (!Number.isFinite(rub) || !Number.isFinite(usdRub) || usdRub <= 0) return null;
  return rub / usdRub;
};

export const formatUsd = (usd: number): string =>
  `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd)} $`;

export const formatRubAndUsd = (
  rub: number,
  usdRub: number | undefined,
): string => {
  const rubPart = new Intl.NumberFormat('ru-RU').format(rub) + ' ₽';
  const usd = usdRub == null ? null : rubToUsd(rub, usdRub);
  if (usd == null) return rubPart;
  return `${rubPart} · ${formatUsd(usd)}`;
};

/** Excel (ru) decimal comma, no thousands separator. */
export const formatExcelNumber = (value: number, fractionDigits = 0): string => {
  if (!Number.isFinite(value)) return '';
  const fixed = value.toFixed(fractionDigits);
  return fractionDigits > 0 ? fixed.replace('.', ',') : fixed;
};
