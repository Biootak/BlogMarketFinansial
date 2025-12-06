'use server';

import type { ExchangeRatesResult } from '@/types/types';
import { getExchangeRates } from '../lib/exchange-rates';

export async function fetchExchangeRates(): Promise<ExchangeRatesResult> {
  return getExchangeRates();
}
