import { useEffect, useState } from 'react';
import { loadUsdRubRates } from '@services/cbrUsd';

export const useUsdRubRates = (dates: string[]): Map<string, number> => {
  const key = [...new Set(dates.filter(Boolean))].sort().join('|');
  const [rates, setRates] = useState<Map<string, number>>(() => new Map());

  useEffect(() => {
    if (!key) {
      setRates(new Map());
      return;
    }
    const wanted = key.split('|');
    let cancelled = false;
    void loadUsdRubRates(wanted)
      .then((next) => {
        if (!cancelled) setRates(next);
      })
      .catch(() => {
        if (!cancelled) setRates(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return rates;
};

export const useUsdRubRate = (isoDate: string | undefined): number | undefined => {
  const rates = useUsdRubRates(isoDate ? [isoDate] : []);
  return isoDate ? rates.get(isoDate) : undefined;
};
