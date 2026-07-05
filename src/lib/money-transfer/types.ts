/**
 * money-transfer/types
 * ----------------------------------------------------------------------------
 * Type مشترک بین data layer، API، و کامپوننت‌های money-transfer.
 * ----------------------------------------------------------------------------
 */

export type CurrencyDirection = 'foreign-to-toman' | 'toman-to-foreign';

export interface TransferRateRow {
  /** کد ارز (مثل USD, EUR) */
  symbol: string;
  /** نام فارسی */
  displayNameFa: string;
  /** نرخ بازار: ۱ واحد = ? تومان */
  marketRateToman: number;
  /** درصد تغییر روزانه */
  changePercent: number;
  /** ISO پرچم (اختیاری، برای badge) */
  flag?: string;
}

export interface ProviderQuote {
  providerId: string;
  providerName: string;
  providerKind: string;
  spreadPercent: number;
  flatFeeToman: number;
  speedMinutes: number;
  features: ReadonlyArray<string>;
  marketToman: number;
  spreadToman: number;
  flatFeeTomanApplied: number;
  finalToman: number;
  markupPercent: number;
}

export interface TransferApiResponse {
  baseTomanRate: number;
  baseSymbol: string;
  baseDisplayName: string;
  baseChangePercent: number;
  sourceAmount: number;
  /** timestamp ISO از آخرین به‌روزرسانی */
  updatedAt: string;
  providers: ProviderQuote[];
}
