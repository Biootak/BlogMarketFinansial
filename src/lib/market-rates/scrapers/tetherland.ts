/**
 * Tetherland (IranExchange) Scraper
 * ---------------------------------
 * Tetherland یکی از بزرگترین صرافی‌های ارز دیجیتال ایران است.
 * این scraper قیمت‌ها را از Tetherland API می‌گیرد.
 */

import { BaseScraper } from './base';
import type { ScrapedRate } from './types';

export class TetherlandScraper extends BaseScraper {
  private readonly baseUrl = 'https://api.tetherland.com';

  async scrape(): Promise<ScrapedRate[]> {
    const rates: ScrapedRate[] = [];

    try {
      // Fetch USDT/IRT rate
      const usdtResponse = await this.fetchJsonWithRetry<{ data: { buy: number; sell: number } }>(
        `${this.baseUrl}/api/currency/price/usdt-irt`,
      );

      if (usdtResponse.data) {
        const { buy, sell } = usdtResponse.data;
        const mid = (buy + sell) / 2;
        rates.push({
          symbol: 'CRYPTO_USDT_IRT',
          value: mid,
          buyValue: buy,
          sellValue: sell,
          changePercent: 0, // Tetherland doesn't provide change percent in simple API
          timestamp: new Date(),
          sourceId: 'tetherland',
        });
      }

      // Fetch other popular crypto rates
      const coins = ['btc', 'eth', 'bnb', 'sol', 'xrp', 'ada', 'doge'];
      for (const coin of coins) {
        try {
          const response = await this.fetchJsonWithRetry<{ data: { buy: number; sell: number } }>(
            `${this.baseUrl}/api/currency/price/${coin}-irt`,
          );
          if (response.data) {
            const { buy, sell } = response.data;
            const mid = (buy + sell) / 2;
            rates.push({
              symbol: `CRYPTO_${coin.toUpperCase()}_IRT`,
              value: mid,
              buyValue: buy,
              sellValue: sell,
              changePercent: 0,
              timestamp: new Date(),
              sourceId: 'tetherland',
            });
          }
        } catch {
          // Skip if this coin fails
        }
      }
    } catch (_error) {}

    return rates;
  }
}
