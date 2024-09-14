'use server';

import { cache } from 'react';
import type { ExchangeRate, ExchangeRatesResult } from '@/types/types';

const CURRENCIES = [
  'BTC',
  'ETH',
  'LTC',
  'USDT',
  'XRP',
  'BCH',
  'BNB',
  'EOS',
  'XLM',
  'ETC',
  'TRX',
  'FTM',
  'UNI',
  'DAI',
  'LINK',
  'DOT',
  'AAVE',
  'ADA',
  'FTM',
  'MATIC',
  'AXS',
  'MANA',
  'SAND',
  'AVAX',
  'MKR',
  'ATOM',
  'TON',
];

interface MarketStats {
  isClosed: boolean;
  bestSell: string;
  bestBuy: string;
  volumeSrc: string;
  volumeDst: string;
  latest: string;
  dayLow: string;
  dayHigh: string;
  dayOpen: string;
  dayClose: string;
  dayChange: string;
}

interface NobitexLocalStatsResponse {
  status: string;
  stats: {
    [key: string]: MarketStats;
  };
}

interface NobitexGlobalStatsResponse {
  status: string;
  markets: {
    binance: {
      [key: string]: number;
    };
  };
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        next: { revalidate: 60 },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20000));
    }
  }
  throw new Error('Max retries reached');
}

export const getExchangeRates = cache(async (): Promise<ExchangeRatesResult> => {
  try {
    const [localResponse, globalResponse] = await Promise.all([
      fetchWithRetry(
        `https://api.nobitex.ir/market/stats?srcCurrency=${CURRENCIES.join(',').toLowerCase()}&dstCurrency=usdt,rls`,
      ),
      fetchWithRetry('https://api.nobitex.ir/market/global-stats', { method: 'POST' }),
    ]);

    const localData = (await localResponse.json()) as NobitexLocalStatsResponse;
    const globalData = (await globalResponse.json()) as NobitexGlobalStatsResponse;

    if (localData.status !== 'ok' || globalData.status !== 'ok') {
      throw new Error('API returned non-ok status');
    }

    const rates: ExchangeRate[] = CURRENCIES.reduce((acc, currency) => {
      const lowerCurrency = currency.toLowerCase();
      const localUsdtStats = localData.stats[`${lowerCurrency}-usdt`];
      const localIrrStats = localData.stats[`${lowerCurrency}-rls`];
      const globalPrice = globalData.markets.binance[lowerCurrency];

      if (!localUsdtStats && !localIrrStats && !globalPrice) {
        return acc;
      }

      const usdtPrice = localUsdtStats ? Number.parseFloat(localUsdtStats.latest) : 0;
      const irrPrice = localIrrStats ? Number.parseFloat(localIrrStats.latest) : 0;
      const change = localUsdtStats ? Number.parseFloat(localUsdtStats.dayChange) : 0;

      if (currency !== 'USDT' || (currency === 'USDT' && irrPrice > 0)) {
        acc.push({
          symbol: currency,
          usdtPrice: currency === 'USDT' ? 1 : usdtPrice,
          irrPrice,
          change,
          globalPrice: globalPrice || undefined,
        });
      }

      return acc;
    }, [] as ExchangeRate[]);

    const sortedRates = [
      ...rates.filter((item) => ['BTC', 'ETH', 'TON'].includes(item.symbol)),
      ...rates.filter((item) => item.symbol === 'USDT'),
      ...rates.filter((item) => !['BTC', 'ETH', 'TON', 'USDT'].includes(item.symbol)),
    ];

    return {
      success: true,
      data: sortedRates,
      message: 'Exchange rates fetched successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      message: 'Failed to fetch exchange rates',
    };
  }
});
