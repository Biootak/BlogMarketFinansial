'use server';

import { getExchangeRates } from '../lib/exchange-rates';
import type { ExchangeRatesResult } from '@/types/types';

export async function fetchExchangeRates(): Promise<ExchangeRatesResult> {
  return getExchangeRates();
}
