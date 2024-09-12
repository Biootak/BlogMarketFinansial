'use server';

import { cache } from 'react';
import type { ExchangeRate } from '@/types/types';

const PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'TONUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'XRPUSDT',
  'DOTUSDT',
  'UNIUSDT',
  'BCHUSDT',
  'LTCUSDT',
  'LINKUSDT',
  'XLMUSDT',
  'ETCUSDT',
  'THETAUSDT',
  'FILUSDT',
  'TRXUSDT',
  'USDTIRT',
  'DASHUSDT',
  'NEOUSDT',
];

interface OrderbookData {
  lastTradePrice: string;
  bestSell: string;
  bestBuy: string;
  volume24h: string;
  price_change_24h: string;
}

interface NobitexResponse {
  status: string;
  [key: string]: OrderbookData | string;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, {
        next: { revalidate: 60 },
        timeout: 10000,
      });
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Max retries reached');
}

export const getExchangeRates = cache(async () => {
  try {
    const response = await fetchWithRetry('https://api.nobitex.ir/v2/orderbook/all');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as NobitexResponse;

    if (data.status !== 'ok') {
      throw new Error(`Nobitex API returned non-ok status: ${data.status}`);
    }

    const usdtIrtRate = Number((data.USDTIRT as OrderbookData)?.lastTradePrice) || 1;

    const rates: ExchangeRate[] = PAIRS.reduce((acc: ExchangeRate[], pairKey) => {
      const stats = data[pairKey] as OrderbookData;
      if (!stats) {
        console.warn(`Missing data for ${pairKey}`);
        return acc;
      }

      const symbol = pairKey.replace('USDT', '').replace('IRT', '');
      const lastTradePrice = Number(stats.lastTradePrice);

      let rateInUsdt, rateInToman;
      if (pairKey === 'USDTIRT') {
        rateInUsdt = 1;
        rateInToman = lastTradePrice;
      } else {
        rateInUsdt = lastTradePrice;
        rateInToman = lastTradePrice * usdtIrtRate;
      }

      const change = Number(stats.price_change_24h);

      console.log(`${pairKey} - Last: ${lastTradePrice}, Change: ${change.toFixed(2)}%`);

      acc.push({
        symbol,
        rate: Number(rateInUsdt.toFixed(8)),
        irrPrice: Math.round(rateInToman),
        change: Number(change.toFixed(2)),
      });

      return acc;
    }, []);

    // مرتب‌سازی نهایی
    const sortedRates = [
      ...rates.filter((item) => ['BTC', 'ETH', 'TON'].includes(item.symbol)),
      ...rates.filter((item) => item.symbol === 'USDT'),
      ...rates.filter((item) => !['BTC', 'ETH', 'TON', 'USDT'].includes(item.symbol)),
    ];

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
