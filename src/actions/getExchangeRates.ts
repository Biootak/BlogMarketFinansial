'use server';

import { cache } from 'react';

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
  'PMN',
  'DOGE',
  'UNI',
  'DAI',
  'LINK',
  'DOT',
  'AAVE',
  'ADA',
  'SHIB',
  'FTM',
  'MATIC',
  'AXS',
  'MANA',
  'SAND',
  'AVAX',
  'MKR',
  'GMT',
  'ATOM',
  'TON',
];

interface MarketStats {
  bestSell: string;
  bestBuy: string;
  latest: string;
  dayChange: string;
}

interface NobitexLocalStatsResponse {
  status: string;
  stats: {
    [key: string]: MarketStats;
  };
}

interface GlobalMarketData {
  kraken?: {
    price: string;
  };
  binance?: {
    price: string;
  };
}

interface NobitexGlobalStatsResponse {
  status: string;
  [key: string]: GlobalMarketData | string;
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
        next: { revalidate: 60 }, // Revalidate every 60 seconds
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Max retries reached');
}

export const getExchangeRates = cache(async () => {
  try {
    // Fetch local market data from Nobitex
    const srcCurrencies = CURRENCIES.join(',').toLowerCase();
    const localUrl = `https://api.nobitex.ir/market/stats?srcCurrency=${srcCurrencies}&dstCurrency=usdt,rls`;
    const localResponse = await fetchWithRetry(localUrl);
    const localData = (await localResponse.json()) as NobitexLocalStatsResponse;

    if (localData.status !== 'ok') {
      throw new Error(`Nobitex local API returned non-ok status: ${localData.status}`);
    }

    // Fetch global market data from Nobitex
    const globalUrl = 'https://api.nobitex.ir/market/global-stats';
    const globalResponse = await fetchWithRetry(globalUrl, {
      method: 'POST',
    });

    const globalData = (await globalResponse.json()) as NobitexGlobalStatsResponse;

    if (globalData.status !== 'ok') {
      throw new Error(`Nobitex global API returned non-ok status: ${globalData.status}`);
    }

    console.log('Global market data:', globalData);

    const rates = CURRENCIES.reduce(
      (
        acc: {
          symbol: string;
          usdtPrice: number;
          irrPrice: number;
          change: number;
          globalPrice?: number;
        }[],
        currency,
      ) => {
        const localUsdtStats = localData.stats[`${currency.toLowerCase()}-usdt`];
        const localIrrStats = localData.stats[`${currency.toLowerCase()}-rls`];
        const globalStats = globalData[currency.toLowerCase()] as GlobalMarketData | undefined;

        if (!localUsdtStats && !localIrrStats && !globalStats) {
          console.warn(`Missing data for ${currency}`);
          return acc;
        }

        const usdtPrice =
          globalStats?.kraken?.price ||
          globalStats?.binance?.price ||
          (localUsdtStats ? localUsdtStats.latest : '0');
        const irrPrice = localIrrStats ? localIrrStats.latest : '0';
        const change = localUsdtStats ? localUsdtStats.dayChange : '0';
        const globalPrice = globalStats?.kraken?.price || globalStats?.binance?.price;

        if (currency !== 'USDT' || (currency === 'USDT' && Number(irrPrice) > 0)) {
          acc.push({
            symbol: currency,
            usdtPrice: currency === 'USDT' ? 1 : Number(usdtPrice),
            irrPrice: Number(irrPrice),
            change: Number(change),
            globalPrice: globalPrice ? Number(globalPrice) : undefined,
          });
        }

        return acc;
      },
      [],
    );

    // Sort rates
    const sortedRates = [
      ...rates.filter((item) => ['BTC', 'ETH', 'TON'].includes(item.symbol)),
      ...rates.filter((item) => item.symbol === 'USDT'),
      ...rates.filter((item) => !['BTC', 'ETH', 'TON', 'USDT'].includes(item.symbol)),
    ];

    console.log('Fetched rates:', sortedRates);

    return {
      success: true,
      data: sortedRates,
    };
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unknown error occurred while fetching exchange rates',
    };
  }
});
