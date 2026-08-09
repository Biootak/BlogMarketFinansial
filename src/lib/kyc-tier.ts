/**
 * kyc-tier — ثابت‌های سطح‌بندی KYC (مشترک بین کلاینت و سرور)
 * ----------------------------------------------------------------------------
 * معماری tiered KYC استاندارد (FATF / صرافی‌های ارز دیجیتال):
 *   LEVEL_1 — تأیید موبایل و تلگرام (OTP):      پایین‌ترین سقف
 *   LEVEL_2 — مدرک هویتی دولتی (تذکره/پاسپورت): سقف متوسط
 *   LEVEL_3 — تأیید چهره + اثبات آدرس:          بالاترین سقف — کمترین ریسک پول‌شویی
 *
 * سقف‌ها به واحد افغانی (AFN). هر سطح بالاتر = سقف تراکنش بالاتر.
 */

export const KYC_TIER_LIMITS = {
  NONE: { perTxnAf: 10_000, dailyAf: 30_000 },
  LEVEL_1: { perTxnAf: 50_000, dailyAf: 150_000 },
  LEVEL_2: { perTxnAf: 300_000, dailyAf: 1_000_000 },
  LEVEL_3: { perTxnAf: 5_000_000, dailyAf: 15_000_000 },
} as const;

export type KycTierKey = keyof typeof KYC_TIER_LIMITS;

export function getKycTierLimits(kycLevel: string | null | undefined): {
  perTxnAf: number;
  dailyAf: number;
} {
  const key = (kycLevel ?? 'NONE') as KycTierKey;
  return KYC_TIER_LIMITS[key] ?? KYC_TIER_LIMITS.NONE;
}

/** متن نمایشی سقف روزانه برای هر سطح — برای UI */
export function dailyLimitLabel(kycLevel: string | null | undefined): string {
  const { dailyAf } = getKycTierLimits(kycLevel);
  return `${new Intl.NumberFormat('fa-IR').format(dailyAf)} AFN در روز`;
}
