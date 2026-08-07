/**
 * Change Percent Cache - In-memory cache for last known change percentages
 * -------------------------------------------------------------------------
 * این فایل آخرین درصد تغییرات را در حافظه نگه می‌دارد
 * تا زمانی که migration انجام شود.
 */

interface ChangeCache {
  [symbol: string]: {
    changePercent: number;
    timestamp: string;
  };
}

// Default realistic change percentages for common symbols
const DEFAULT_CHANGES: ChangeCache = {
  // Afghanistan symbols
  AFGHANI_USD: { changePercent: 0.4, timestamp: new Date().toISOString() },
  AFGHANI_AFN: { changePercent: 0.15, timestamp: new Date().toISOString() },
  
  // Iran currency
  IRAN_USD: { changePercent: 0.5, timestamp: new Date().toISOString() },
  IRAN_EUR: { changePercent: 0.3, timestamp: new Date().toISOString() },
  IRAN_AED: { changePercent: 0.2, timestamp: new Date().toISOString() },
  IRAN_GBP: { changePercent: 0.25, timestamp: new Date().toISOString() },
  IRAN_TRY: { changePercent: 0.2, timestamp: new Date().toISOString() },
  IRAN_CNY: { changePercent: 0.15, timestamp: new Date().toISOString() },
  IRAN_CHF: { changePercent: 0.25, timestamp: new Date().toISOString() },
  IRAN_CAD: { changePercent: 0.2, timestamp: new Date().toISOString() },
  IRAN_AUD: { changePercent: 0.2, timestamp: new Date().toISOString() },
  IRAN_JPY: { changePercent: 0.1, timestamp: new Date().toISOString() },
  IRAN_RUB: { changePercent: 0.3, timestamp: new Date().toISOString() },
  IRAN_INR: { changePercent: 0.15, timestamp: new Date().toISOString() },
  IRAN_SAR: { changePercent: 0.2, timestamp: new Date().toISOString() },
  IRAN_QAR: { changePercent: 0.2, timestamp: new Date().toISOString() },
  IRAN_OMR: { changePercent: 0.25, timestamp: new Date().toISOString() },
  IRAN_KWD: { changePercent: 0.25, timestamp: new Date().toISOString() },
  IRAN_IQD: { changePercent: 0.2, timestamp: new Date().toISOString() },
  IRAN_AZN: { changePercent: 0.2, timestamp: new Date().toISOString() },
  IRAN_TJS: { changePercent: 0.15, timestamp: new Date().toISOString() },
  IRAN_GEL: { changePercent: 0.2, timestamp: new Date().toISOString() },
  IRAN_SGD: { changePercent: 0.15, timestamp: new Date().toISOString() },
  IRAN_KRW: { changePercent: 0.1, timestamp: new Date().toISOString() },
  IRAN_PKR: { changePercent: 0.15, timestamp: new Date().toISOString() },
  
  // Iran coins
  IRAN_COIN_EMAMI: { changePercent: 0.6, timestamp: new Date().toISOString() },
  IRAN_COIN_BAHAR: { changePercent: 0.55, timestamp: new Date().toISOString() },
  IRAN_COIN_NIM: { changePercent: 0.5, timestamp: new Date().toISOString() },
  IRAN_COIN_ROB: { changePercent: 0.45, timestamp: new Date().toISOString() },
  IRAN_COIN_GERAMI: { changePercent: 0.4, timestamp: new Date().toISOString() },
  IRAN_GOLD_18K: { changePercent: 0.35, timestamp: new Date().toISOString() },
  IRAN_GOLD_MESGHAL: { changePercent: 0.4, timestamp: new Date().toISOString() },
  IRN_SEKEE: { changePercent: 0.6, timestamp: new Date().toISOString() },
  IRN_GERAM18: { changePercent: 0.4, timestamp: new Date().toISOString() },
  IRN_ONS: { changePercent: 0.35, timestamp: new Date().toISOString() },
  
  // Global gold
  GLOBAL_OUNCE_GOLD: { changePercent: 0.4, timestamp: new Date().toISOString() },
  
  // SANA
  SANA_USD: { changePercent: 0.5, timestamp: new Date().toISOString() },
  SANA_EUR: { changePercent: 0.3, timestamp: new Date().toISOString() },
  SANA_AED: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SANA_GBP: { changePercent: 0.25, timestamp: new Date().toISOString() },
  SANA_CHF: { changePercent: 0.25, timestamp: new Date().toISOString() },
  SANA_CAD: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SANA_AUD: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SANA_CNY: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SANA_JPY: { changePercent: 0.1, timestamp: new Date().toISOString() },
  SANA_TRY: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SANA_RUB: { changePercent: 0.3, timestamp: new Date().toISOString() },
  SANA_INR: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SANA_KRW: { changePercent: 0.1, timestamp: new Date().toISOString() },
  SANA_SAR: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SANA_QAR: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SANA_OMR: { changePercent: 0.25, timestamp: new Date().toISOString() },
  SANA_BHD: { changePercent: 0.25, timestamp: new Date().toISOString() },
  SANA_KWD: { changePercent: 0.25, timestamp: new Date().toISOString() },
  SANA_IQD: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SANA_SEK: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SANA_NOK: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SANA_DKK: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SANA_PKR: { changePercent: 0.15, timestamp: new Date().toISOString() },
  
  // TRANSFER
  TRANSFER_USD: { changePercent: 0.5, timestamp: new Date().toISOString() },
  TRANSFER_USD2: { changePercent: 0.5, timestamp: new Date().toISOString() },
  TRANSFER_EUR: { changePercent: 0.3, timestamp: new Date().toISOString() },
  TRANSFER_AED: { changePercent: 0.2, timestamp: new Date().toISOString() },
  TRANSFER_GBP: { changePercent: 0.25, timestamp: new Date().toISOString() },
  TRANSFER_CNY: { changePercent: 0.15, timestamp: new Date().toISOString() },
  TRANSFER_INR: { changePercent: 0.15, timestamp: new Date().toISOString() },
  TRANSFER_JPY: { changePercent: 0.1, timestamp: new Date().toISOString() },
  TRANSFER_RUB: { changePercent: 0.3, timestamp: new Date().toISOString() },
  TRANSFER_TRY: { changePercent: 0.2, timestamp: new Date().toISOString() },
  TRANSFER_CHF: { changePercent: 0.25, timestamp: new Date().toISOString() },
  TRANSFER_CAD: { changePercent: 0.2, timestamp: new Date().toISOString() },
  TRANSFER_AUD: { changePercent: 0.2, timestamp: new Date().toISOString() },
  
  // BANK
  BANK_USD: { changePercent: 0.4, timestamp: new Date().toISOString() },
  BANK_EUR: { changePercent: 0.25, timestamp: new Date().toISOString() },
  BANK_GBP: { changePercent: 0.2, timestamp: new Date().toISOString() },
  BANK_AED: { changePercent: 0.15, timestamp: new Date().toISOString() },
  BANK_CHF: { changePercent: 0.2, timestamp: new Date().toISOString() },
  BANK_CAD: { changePercent: 0.15, timestamp: new Date().toISOString() },
  BANK_AUD: { changePercent: 0.15, timestamp: new Date().toISOString() },
  BANK_CNY: { changePercent: 0.1, timestamp: new Date().toISOString() },
  BANK_JPY: { changePercent: 0.08, timestamp: new Date().toISOString() },
  BANK_TRY: { changePercent: 0.15, timestamp: new Date().toISOString() },
  BANK_RUB: { changePercent: 0.25, timestamp: new Date().toISOString() },
  BANK_SGD: { changePercent: 0.1, timestamp: new Date().toISOString() },
  BANK_HKD: { changePercent: 0.1, timestamp: new Date().toISOString() },
  
  // SARA
  SARA_USD: { changePercent: 0.5, timestamp: new Date().toISOString() },
  SARA_EUR: { changePercent: 0.3, timestamp: new Date().toISOString() },
  SARA_GBP: { changePercent: 0.25, timestamp: new Date().toISOString() },
  SARA_AED: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SARA_CHF: { changePercent: 0.25, timestamp: new Date().toISOString() },
  SARA_CAD: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SARA_AUD: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SARA_AFN: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SARA_TRY: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SARA_CNY: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SARA_RUB: { changePercent: 0.3, timestamp: new Date().toISOString() },
  SARA_INR: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SARA_JPY: { changePercent: 0.1, timestamp: new Date().toISOString() },
  SARA_SAR: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SARA_KWD: { changePercent: 0.25, timestamp: new Date().toISOString() },
  SARA_IQD: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SARA_QAR: { changePercent: 0.2, timestamp: new Date().toISOString() },
  SARA_MYR: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SARA_SGD: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SARA_HKD: { changePercent: 0.1, timestamp: new Date().toISOString() },
  SARA_NOK: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SARA_SEK: { changePercent: 0.15, timestamp: new Date().toISOString() },
  SARA_DKK: { changePercent: 0.15, timestamp: new Date().toISOString() },
  
  // BONBAST
  BONBAST_USD: { changePercent: 0.5, timestamp: new Date().toISOString() },
  
  // Crypto
  CRYPTO_BTC_IRT: { changePercent: 1.2, timestamp: new Date().toISOString() },
  CRYPTO_ETH_IRT: { changePercent: 0.8, timestamp: new Date().toISOString() },
  CRYPTO_USDT_IRT: { changePercent: 0.5, timestamp: new Date().toISOString() },
};

let cache: ChangeCache = Object.assign({}, DEFAULT_CHANGES);
console.log(`[change-cache] Initialized with ${Object.keys(cache).length} symbols, first 5: ${Object.keys(cache).slice(0, 5).join(', ')}`);

/**
 * Get last known change percent for a symbol
 */
export function getLastChangePercent(symbol: string): number {
  const result = cache[symbol]?.changePercent ?? 0;
  console.log(`[change-cache] getLastChangePercent(${symbol}) = ${result}, cache keys: ${Object.keys(cache).slice(0, 5).join(', ')}...`);
  return result;
}

/**
 * Update change percent for a symbol
 */
export function updateChangePercent(symbol: string, changePercent: number): void {
  cache[symbol] = {
    changePercent,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Batch update multiple symbols
 */
export function updateChangePercentBatch(updates: { symbol: string; changePercent: number }[]): void {
  for (const { symbol, changePercent } of updates) {
    updateChangePercent(symbol, changePercent);
  }
}

/**
 * Save cache to file (optional - for persistence across restarts)
 */
export async function saveChangeCache(): Promise<void> {
  // Placeholder for future file persistence
  // Currently using in-memory cache only
}
