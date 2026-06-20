'use server';

import { unstable_cache } from 'next/cache';
import { getExchangeRates } from '../lib/exchange-rates';
import type { ExchangeRatesResult } from '@/types/types';

/* 2026-06-19: previously this delegated straight to getExchangeRates,
 * which is wrapped only with React's `cache` (per-request dedupe). That
 * is enough to avoid duplicate calls within a single render, but every
 * NEW request still re-fetched the Exir API (~1.2s RTT) and re-ran the
 * rate-processing/sorting. Wrapping with unstable_cache (60s, tag
 * `exchange-rates`) memoizes the fully-computed result across requests,
 * so the home page's SectionExchangeRates + SectionLargeSlider + ticker
 * widgets all share one processed payload per minute. The inner
 * getExchangeRates still calls fetch() with next:{revalidate:60}, so
 * cache misses fall through to a fresh (but HTTP-cached) Exir fetch.
 */
const getCachedExchangeRates = unstable_cache(
  async (): Promise<ExchangeRatesResult> => getExchangeRates(),
  ['exchange-rates', 'v1-2026-06-19'],
  {
    revalidate: 60,
    tags: ['exchange-rates'],
  },
);

export async function fetchExchangeRates(): Promise<ExchangeRatesResult> {
  return getCachedExchangeRates();
}
