import type { CryptoTickerRate, CryptoTickerResult } from '@/types/types';
import { cache } from 'react';

// Exir API Base URL
const EXIR_API_BASE = 'https://api.exir.io/v2';

// لیست ارزهای پشتیبانی شده
const CURRENCIES = [
  'BTC',
  'ETH',
  'USDT',
  'XRP',
  'LTC',
  'BCH',
  'EOS',
  'XLM',
  'TRX',
  'LINK',
  'UNI',
  'AAVE',
  'DOT',
  'ADA',
  'DOGE',
  'SHIB',
  'MATIC',
  'SOL',
  'AVAX',
  'ATOM',
  'FTM',
  'SAND',
  'MANA',
  'AXS',
];

const CACHE_TTL = 60; // 1 minute
const MAX_RETRIES = 2;
const RETRY_DELAY = 500;
const USE_MOCK_ON_FAILURE = false;

// Mock data for fallback
const MOCK_RATES: CryptoTickerRate[] = [
  { symbol: 'BTC', usdtPrice: 97500, irrPrice: 11190000000, change: 2.5, globalPrice: 97500 },
  { symbol: 'ETH', usdtPrice: 3650, irrPrice: 378800000, change: 1.8, globalPrice: 3650 },
  { symbol: 'USDT', usdtPrice: 1, irrPrice: 120800, change: 0, globalPrice: 1 },
  { symbol: 'XRP', usdtPrice: 2.3, irrPrice: 278000, change: 3.1, globalPrice: 2.3 },
  { symbol: 'SOL', usdtPrice: 180, irrPrice: 21744000, change: 2.1, globalPrice: 180 },
  { symbol: 'DOGE', usdtPrice: 0.38, irrPrice: 45900, change: -0.5, globalPrice: 0.38 },
  { symbol: 'ADA', usdtPrice: 1.05, irrPrice: 126800, change: -1.2, globalPrice: 1.05 },
  { symbol: 'AVAX', usdtPrice: 42, irrPrice: 5073600, change: 2.8, globalPrice: 42 },
  { symbol: 'DOT', usdtPrice: 8.5, irrPrice: 1026800, change: 0.9, globalPrice: 8.5 },
  { symbol: 'LINK', usdtPrice: 24, irrPrice: 2899200, change: 1.5, globalPrice: 24 },
];

const logger = {
  error: (_message: string, _error?: unknown) => {
    // silenced — use server-side logging if needed
  },
  info: (_message: string) => {
    // silenced — use server-side logging if needed
  },
};

// Exir Tickers API Response Type
interface ExirTicker {
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
  last: number;
  volume: number;
  symbol: string;
}

interface ExirTickersResponse {
  [pair: string]: ExirTicker;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
  delay = RETRY_DELAY,
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
  };

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
      // 4xx (غیر از 429) قابل retry نیست — فوری throw کن
      const statusMatch = error instanceof Error && error.message.match(/status: (\d+)/);
      const statusCode = statusMatch ? Number(statusMatch[1]) : 0;
      const isNonRetryable = statusCode >= 400 && statusCode < 500 && statusCode !== 429;

      if (isNonRetryable || i === retries - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}

/**
 * دریافت تمام قیمت‌ها از Exir API
 * @see https://apidocs.exir.io/#tickers
 */
async function fetchExirTickers(): Promise<ExirTickersResponse> {
  const url = `${EXIR_API_BASE}/tickers`;
  const response = await fetchWithRetry(url);
  return response.json();
}

/**
 * محاسبه درصد تغییر روزانه
 */
function calculateDayChange(open: number, close: number): number {
  if (open === 0) return 0;
  return Number((((close - open) / open) * 100).toFixed(2));
}

/**
 * پردازش داده‌های نرخ ارز از پاسخ Exir API
 */
function processExirRates(tickers: ExirTickersResponse): CryptoTickerRate[] {
  const rates: CryptoTickerRate[] = [];
  const usdtIrtRate = tickers['usdt-irt']?.last || 120800; // نرخ تتر به تومان

  for (const currency of CURRENCIES) {
    const lowerCurrency = currency.toLowerCase();

    // جفت ارز با USDT
    const usdtPair = `${lowerCurrency}-usdt`;
    // جفت ارز با IRT (تومان)
    const irtPair = `${lowerCurrency}-irt`;

    const usdtTicker = tickers[usdtPair];
    const irtTicker = tickers[irtPair];

    // برای USDT - نمایش قیمت تومانی
    if (currency === 'USDT') {
      const ticker = tickers['usdt-irt'];
      if (ticker && ticker.last > 0) {
        rates.push({
          symbol: 'USDT',
          usdtPrice: 1,
          irrPrice: ticker.last * 10, // تبدیل تومان به ریال
          change: calculateDayChange(ticker.open, ticker.close),
          globalPrice: 1,
        });
        logger.info(`USDT price: ${ticker.last} IRT`);
      } else {
        // اگه قیمت نبود، از مقدار پیش‌فرض استفاده کن
        rates.push({
          symbol: 'USDT',
          usdtPrice: 1,
          irrPrice: 1207050, // ~120,705 تومان به ریال
          change: 0,
          globalPrice: 1,
        });
      }
      continue;
    }

    // برای بقیه ارزها
    if (usdtTicker || irtTicker) {
      const usdtPrice = usdtTicker?.last || 0;
      const irtPrice = irtTicker?.last || usdtPrice * usdtIrtRate;

      rates.push({
        symbol: currency,
        usdtPrice,
        irrPrice: irtPrice * 10, // تبدیل تومان به ریال
        change: usdtTicker
          ? calculateDayChange(usdtTicker.open, usdtTicker.close)
          : irtTicker
            ? calculateDayChange(irtTicker.open, irtTicker.close)
            : 0,
        globalPrice: usdtPrice,
      });
    }
  }

  return rates;
}

export const getExirCryptoRates = cache(async (): Promise<CryptoTickerResult> => {
  try {
    logger.info('Fetching crypto ticker rates from Exir API...');

    const tickers = await fetchExirTickers();

    // M18 fix: guard the response shape before indexing. If Exir wraps the
    // envelope (e.g. { data: {...} }) or returns a non-object, indexing
    // `tickers['usdt-irt']` would throw a raw TypeError. Validate first so
    // we fall back gracefully via the catch block below.
    if (!tickers || typeof tickers !== 'object' || Array.isArray(tickers)) {
      throw new Error('Invalid Exir API response shape');
    }

    logger.info(`Received ${Object.keys(tickers).length} pairs from Exir`);

    const rates = processExirRates(tickers);

    if (rates.length === 0) {
      throw new Error('No valid rates received from Exir API');
    }

    // مرتب‌سازی: BTC, ETH اول، بعد USDT، بعد بقیه
    const sortedRates = [
      ...rates.filter((item) => ['BTC', 'ETH'].includes(item.symbol)),
      ...rates.filter((item) => item.symbol === 'USDT'),
      ...rates.filter((item) => !['BTC', 'ETH', 'USDT'].includes(item.symbol)),
    ];

    return {
      success: true,
      data: sortedRates,
      message: 'نرخ‌ها با موفقیت دریافت شد',
    };
  } catch (error) {
    // 403/4xx = Exir این سرور را block کرده — خطای شناخته‌شده، نه باگ
    // لاگ نزن تا console پر از noise نشود
    const statusMatch = error instanceof Error && error.message.match(/status: (\d+)/);
    const statusCode = statusMatch ? Number(statusMatch[1]) : 0;
    const isKnownBlock = statusCode >= 400 && statusCode < 500;
    if (!isKnownBlock) {
      logger.error('Error in getExirCryptoRates:', error);
    }

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
