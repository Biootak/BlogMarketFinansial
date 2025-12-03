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
const CACHE_TTL = 300; // 5 minutes
const MAX_RETRIES = 2; // Reduced retries for faster fallback
const RETRY_DELAY = 500; // 0.5 second
const USE_MOCK_ON_FAILURE = true; // Enable mock data when API fails

// Mock data for development/fallback when API is unavailable
const MOCK_RATES: ExchangeRate[] = [
  { symbol: 'BTC', usdtPrice: 97500, irrPrice: 9750000000, change: 2.5, globalPrice: 97500 },
  { symbol: 'ETH', usdtPrice: 3650, irrPrice: 365000000, change: 1.8, globalPrice: 3650 },
  { symbol: 'TON', usdtPrice: 5.8, irrPrice: 580000, change: -0.5, globalPrice: 5.8 },
  { symbol: 'USDT', usdtPrice: 1, irrPrice: 100000, change: 0, globalPrice: 1 },
  { symbol: 'BNB', usdtPrice: 650, irrPrice: 65000000, change: 1.2, globalPrice: 650 },
  { symbol: 'XRP', usdtPrice: 2.3, irrPrice: 230000, change: 3.1, globalPrice: 2.3 },
  { symbol: 'ADA', usdtPrice: 1.05, irrPrice: 105000, change: -1.2, globalPrice: 1.05 },
  { symbol: 'AVAX', usdtPrice: 42, irrPrice: 4200000, change: 2.8, globalPrice: 42 },
  { symbol: 'DOT', usdtPrice: 8.5, irrPrice: 850000, change: 0.9, globalPrice: 8.5 },
  { symbol: 'LINK', usdtPrice: 24, irrPrice: 2400000, change: 1.5, globalPrice: 24 },
];

const logger = {
  error: (message: string, error?: any) => {
    console.error(`[ExchangeRates Error] ${message}`, error);
  },
  info: (message: string) => {
    console.info(`[ExchangeRates Info] ${message}`);
  }
};

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
      // Add AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
        next: { revalidate: CACHE_TTL },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      // Only log on first attempt to reduce noise
      if (i === 0) {
        logger.error(`API request failed (will retry ${retries - 1} more times)`);
      }
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
        logger.error(`Error processing currency ${currency}:`, error);
        invalidCurrencies.push(currency);
      }
    }

    if (invalidCurrencies.length > 0) {
      logger.info(`Invalid currencies: ${invalidCurrencies.join(', ')}`);
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
    logger.error('Error in getExchangeRates:', error);
    
    // Return mock data when API fails (for development/network issues)
    if (USE_MOCK_ON_FAILURE) {
      logger.info('Using mock data due to API failure');
      return {
        success: true,
        data: MOCK_RATES,
        message: 'داده‌های نمونه (API در دسترس نیست)',
      };
    }
    
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      message: 'نرخ ارز در دسترس نیست. لطفاً اتصال اینترنت خود را بررسی کنید.',
    };
  }
});
