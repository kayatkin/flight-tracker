import { cbrDailyUrl, cbrDotDateToIso, isoToCbrDate, parseCbrUsdRate } from './cbrUsd.ts';

const SAMPLE = `<?xml version="1.0" encoding="windows-1251"?>
<ValCurs Date="15.09.2026" name="Foreign Currency Market">
  <Valute ID="R01235">
    <NumCode>840</NumCode>
    <CharCode>USD</CharCode>
    <Nominal>1</Nominal>
    <Name>Доллар США</Name>
    <Value>81,2345</Value>
    <VunitRate>81,2345</VunitRate>
  </Valute>
</ValCurs>`;

Deno.test('converts ISO dates to CBR date_req', () => {
  if (isoToCbrDate('2026-09-15') !== '15/09/2026') throw new Error('iso');
  if (cbrDotDateToIso('15.09.2026') !== '2026-09-15') throw new Error('dot');
  if (cbrDailyUrl('2026-09-15')?.includes('date_req=15/09/2026') !== true) {
    throw new Error('url');
  }
});

Deno.test('parses USD from CBR XML', () => {
  const parsed = parseCbrUsdRate(SAMPLE);
  if (!parsed) throw new Error('missing');
  if (parsed.usdRub !== 81.2345) throw new Error(`rate ${parsed.usdRub}`);
  if (parsed.cbrDate !== '2026-09-15') throw new Error(`date ${parsed.cbrDate}`);
});

Deno.test('uses Value/Nominal when VunitRate is absent', () => {
  const xml = `<ValCurs Date="02.03.2002">
    <Valute ID="R01235"><CharCode>USD</CharCode><Nominal>1</Nominal><Value>30,9456</Value></Valute>
  </ValCurs>`;
  const parsed = parseCbrUsdRate(xml);
  if (!parsed || parsed.usdRub !== 30.9456) throw new Error(String(parsed?.usdRub));
});

Deno.test('divides Value by Nominal when the unit is not 1', () => {
  const xml = `<ValCurs Date="15.09.2026">
    <Valute ID="R01235"><CharCode>USD</CharCode><Nominal>10</Nominal><Value>812,345</Value></Valute>
  </ValCurs>`;
  const parsed = parseCbrUsdRate(xml);
  if (!parsed || parsed.usdRub !== 81.2345) throw new Error(String(parsed?.usdRub));
});

Deno.test('returns null when USD is missing', () => {
  if (parseCbrUsdRate('<ValCurs></ValCurs>') !== null) throw new Error('expected null');
  if (isoToCbrDate('15.09.2026') !== null) throw new Error('expected invalid iso');
});
