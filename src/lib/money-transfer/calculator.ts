/**
 * money-transfer/calculator
 * ----------------------------------------------------------------------------
 * منطق محاسبه‌ی تبدیل ارز و اعمال کارمزد provider ها.
 *
 * نمودار:
 *   sourceAmount (ارز مبدأ)
 *     × rate (نرخ بازار)
 *     = marketToman (معادل تومان بازار)
 *     + spread% × marketToman
 *     + flatFeeToman
 *     = finalToman (مبلغ نهایی پرداختی کاربر)
 *
 * یا برعکس:
 *   targetToman (تومان مقصد)
 *     ÷ (1 + spread%)
 *     − flatFeeToman
 *     ÷ rate
 *     = sourceAmount (ارز مبدأ لازم)
 * ----------------------------------------------------------------------------
 */

import type { TransferProvider } from './providers';

export interface ConversionInput {
  /** مقدار ارز مبدأ */
  sourceAmount: number;
  /** نرخ بازار: ۱ واحد source = ? toman */
  rateSourceToToman: number;
  /** provider (صرافی) که نرخ و کارمزدش اعمال می‌شود */
  provider: TransferProvider;
}

export interface ConversionResult {
  /** تومان معادل بازار (بدون کارمزد) */
  marketToman: number;
  /** کارمزد ضمنی (اختلاف بازار با صرافی) */
  spreadToman: number;
  /** کارمزد ثابت */
  flatFeeToman: number;
  /** مبلغ نهایی پرداختی/دریافتی به تومان */
  finalToman: number;
  /** نرخ مؤثر (نهایی) */
  effectiveRate: number;
  /** درصد اختلاف با بازار (برای نمایش٪ markup) */
  markupPercent: number;
}

const ZERO = 0;

export function convertSourceToToman(input: ConversionInput): ConversionResult {
  const { sourceAmount, rateSourceToToman, provider } = input;
  const marketToman = Math.round(sourceAmount * rateSourceToToman);
  // M11: Math.round برای جلوگیری از خطای float (0.7% روی 10M تومان = 69,999.9999)
  const spreadToman = Math.round(marketToman * (provider.spreadPercent / 100));
  const flatFeeToman = provider.flatFeeToman;
  const finalToman = marketToman + spreadToman + flatFeeToman;
  const effectiveRate = sourceAmount > ZERO ? finalToman / sourceAmount : ZERO;
  const markupPercent =
    marketToman > ZERO ? ((finalToman - marketToman) / marketToman) * 100 : ZERO;
  return {
    marketToman,
    spreadToman,
    flatFeeToman,
    finalToman,
    effectiveRate,
    markupPercent,
  };
}

/**
 * Inverse: کاربر می‌خواهد دقیقاً X تومان بگیرد. چند واحد ارز مبدأ لازم است؟
 * (با احتساب کارمزد provider)
 */
export function convertTomanToSource(
  targetToman: number,
  rateSourceToToman: number,
  provider: TransferProvider,
): { sourceAmount: number; marketToman: number; spreadToman: number; flatFeeToman: number } {
  const subtotalAfterFee = Math.max(0, Math.round(targetToman) - provider.flatFeeToman);
  // M11: Math.round برای ثبات محاسبات float
  const marketToman = Math.round(subtotalAfterFee / (1 + provider.spreadPercent / 100));
  const sourceAmount = rateSourceToToman > ZERO ? marketToman / rateSourceToToman : ZERO;
  const spreadToman = subtotalAfterFee - marketToman;
  return {
    sourceAmount,
    marketToman,
    spreadToman,
    flatFeeToman: provider.flatFeeToman,
  };
}

/**
 * فرمت عدد فارسی با جداکننده هزارگان. مثل `۱٬۶۲۵٬۲۰۰`.
 */
export function formatPersianNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * فرمت درصد فارسی مثل `+۱٫۴۰٪`.
 */
export function formatPersianPercent(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '۰٪';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const num = formatPersianNumber(Math.abs(value), decimals);
  return `${sign}${num}٪`;
}
