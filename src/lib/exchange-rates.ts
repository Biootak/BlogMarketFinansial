import { cache } from 'react';
import type { ExchangeRate, ExchangeRatesResult } from '@/types/types';

// لیست اولیه ارزها (می‌تواند از یک منبع خارجی به‌روزرسانی شود)
let CURRENCIES = [
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
  'AXS',
  'MANA',
  'SAND',
  'AVAX',
  'MKR',
  'ATOM',
  'TON',
];

const CHUNK_SIZE = 5;
const CACHE_TTL = 60; // 60 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface GlobalCurrencyData {
  binance?: {
    price: string;
  };
}
interface GlobalApiResponse {
  status: string;
  [currency: string]: GlobalCurrencyData | string;
}
interface CurrencyStats {
  latest: string;
  dayChange: string;
}

interface LocalApiResponse {
  status: string;
  stats?: Record<string, CurrencyStats>;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
  delay = RETRY_DELAY,
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'YourAppName/1.0',
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
        next: { revalidate: CACHE_TTL },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}

async function fetchLocalStats(currencies: string[]): Promise<LocalApiResponse> {
  const url = `https://api.nobitex.ir/market/stats?srcCurrency=${currencies.join(',').toLowerCase()}&dstCurrency=usdt,rls`;
  const response = await fetchWithRetry(url);
  return response.json();
}

async function fetchGlobalStats(): Promise<GlobalApiResponse> {
  const response = await fetchWithRetry('https://api.nobitex.ir/market/global-stats', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return response.json();
}

function processExchangeRate(
  currency: string,
  localData: Record<string, CurrencyStats>,
  globalData: GlobalApiResponse,
): ExchangeRate | null {
  const lowerCurrency = currency.toLowerCase();
  const localUsdtStats = localData[`${lowerCurrency}-usdt`];
  const localIrrStats = localData[`${lowerCurrency}-rls`];
  const globalCurrencyData = globalData[lowerCurrency] as GlobalCurrencyData;
  const globalPrice = globalCurrencyData?.binance?.price;

  if (!localUsdtStats && !localIrrStats && !globalPrice) {
    return null;
  }

  const usdtPrice = localUsdtStats ? Number.parseFloat(localUsdtStats.latest) : 0;
  const irrPrice = localIrrStats ? Number.parseFloat(localIrrStats.latest) : 0;
  const change = localUsdtStats ? Number.parseFloat(localUsdtStats.dayChange) : 0;

  if (currency !== 'USDT' || (currency === 'USDT' && irrPrice > 0)) {
    return {
      symbol: currency,
      usdtPrice: currency === 'USDT' ? 1 : usdtPrice,
      irrPrice,
      change,
      globalPrice: globalPrice ? Number.parseFloat(globalPrice) : undefined,
    };
  }

  return null;
}

export const getExchangeRates = cache(async (): Promise<ExchangeRatesResult> => {
  try {
    const currencyChunks = [];
    for (let i = 0; i < CURRENCIES.length; i += CHUNK_SIZE) {
      currencyChunks.push(CURRENCIES.slice(i, i + CHUNK_SIZE));
    }

    const localStatsPromises = currencyChunks.map((chunk) => fetchLocalStats(chunk));
    const [localStatsResults, globalData] = await Promise.all([
      Promise.all(localStatsPromises),
      fetchGlobalStats(),
    ]);

    if (globalData.status !== 'ok') {
      throw new Error('Global API returned non-ok status');
    }

    const localData = localStatsResults.reduce<Record<string, CurrencyStats>>((acc, result) => {
      if (result.status === 'ok' && result.stats) {
        Object.assign(acc, result.stats);
      }
      return acc;
    }, {});

    const invalidCurrencies: string[] = [];
    const rates: ExchangeRate[] = [];

    for (const currency of CURRENCIES) {
      try {
        const rate = processExchangeRate(currency, localData, globalData);
        if (rate) {
          rates.push(rate);
        } else {
          invalidCurrencies.push(currency);
        }
      } catch (error) {
        console.error(`Error processing currency ${currency}:`, error);
        invalidCurrencies.push(currency);
      }
    }

    if (invalidCurrencies.length > 0) {
      console.warn('Invalid currencies:', invalidCurrencies);
      // حذف ارزهای نامعتبر از لیست اصلی
      CURRENCIES = CURRENCIES.filter((c) => !invalidCurrencies.includes(c));
    }

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
    console.error('Error in getExchangeRates:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      message: 'Failed to fetch exchange rates',
    };
  }
});
