/**
 * Exir.ir Scraper
 * ----------------
 * Exir یکی از معتبرترین صرافی‌های آنلاین ایران است.
 * این scraper قیمت‌ها را از صفحه Exir می‌گیرد.
 */

import { BaseScraper } from './base';
import type { ScrapedRate } from './types';

export class ExirScraper extends BaseScraper {
  private readonly baseUrl = 'https://exir.io';

  async scrape(): Promise<ScrapedRate[]> {
    const rates: ScrapedRate[] = [];

    try {
      // Fetch main page
      const _html = await this.fetchWithRetry(`${this.baseUrl}/exchange/btc-irt`);

      // Parse HTML and extract rates
      // Exir uses JSON in script tags or API endpoints
      // For now, we'll use their public API if available
      const response = await this.fetchJsonWithRetry<{ data: { open: number; close: number }[] }>(
        `${this.baseUrl}/api/v1/market?symbol=btc-irt`,
      );

      if (response.data) {
        // Extract BTC rate
        const btcData = response.data[0];
        if (btcData?.close) {
          rates.push({
            symbol: 'CRYPTO_BTC',
            value: btcData.close,
            changePercent: this.calculateChange(btcData.open, btcData.close),
            timestamp: new Date(),
            sourceId: 'exir',
          });
        }
      }

      // Also fetch other popular coins
      const symbols = ['eth-irt', 'usdt-irt', 'bnb-irt'];
      for (const symbol of symbols) {
        try {
          const coinResponse = await this.fetchJsonWithRetry<{
            data: { open: number; close: number }[];
          }>(`${this.baseUrl}/api/v1/market?symbol=${symbol}`);
          if (coinResponse.data?.[0]) {
            const data = coinResponse.data[0];
            const coinSymbol = symbol.toUpperCase().replace('-IRT', '_IRT');
            rates.push({
              symbol: `CRYPTO_${coinSymbol}`,
              value: data.close,
              changePercent: this.calculateChange(data.open, data.close),
              timestamp: new Date(),
              sourceId: 'exir',
            });
          }
        } catch {
          // Skip if this symbol fails
        }
      }
    } catch (_error) {}

    return rates;
  }

  private calculateChange(open: number, close: number): number {
    if (!open || !close || open === 0) return 0;
    return ((close - open) / open) * 100;
  }
}
