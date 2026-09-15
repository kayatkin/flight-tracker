const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isoToCbrDate(iso: string): string | null {
  const match = ISO_DATE.exec(iso.trim());
  if (!match) return null;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function cbrDotDateToIso(dotted: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dotted.trim());
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseCbrNumber(raw: string): number | null {
  const value = Number(raw.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export interface CbrUsdRate {
  usdRub: number;
  cbrDate: string;
}

/** Official CBR XML: USD rubles per $1 on the quoted day. */
export function parseCbrUsdRate(xml: string): CbrUsdRate | null {
  const usdBlock = xml.match(
    /<Valute[^>]*>[\s\S]*?<CharCode>\s*USD\s*<\/CharCode>[\s\S]*?<\/Valute>/i,
  );
  if (!usdBlock) return null;

  const unit = usdBlock[0].match(/<VunitRate>\s*([^<]+)\s*<\/VunitRate>/i);
  const value = usdBlock[0].match(/<Value>\s*([^<]+)\s*<\/Value>/i);
  const nominalRaw = usdBlock[0].match(/<Nominal>\s*([^<]+)\s*<\/Nominal>/i);
  const nominal = parseCbrNumber(nominalRaw?.[1] ?? '1') ?? 1;

  let usdRub: number | null = null;
  if (unit?.[1]) {
    usdRub = parseCbrNumber(unit[1]);
  } else if (value?.[1]) {
    const amount = parseCbrNumber(value[1]);
    usdRub = amount == null ? null : amount / nominal;
  }
  if (usdRub == null) return null;

  const quoted = xml.match(/<ValCurs[^>]*\bDate="(\d{2}\.\d{2}\.\d{4})"/i);
  const cbrDate = quoted?.[1] ? cbrDotDateToIso(quoted[1]) ?? '' : '';
  return { usdRub, cbrDate };
}

export function cbrDailyUrl(isoDate: string): string | null {
  const cbrDate = isoToCbrDate(isoDate);
  if (!cbrDate) return null;
  return `https://www.cbr.ru/scripts/XML_daily.asp?date_req=${cbrDate}`;
}
