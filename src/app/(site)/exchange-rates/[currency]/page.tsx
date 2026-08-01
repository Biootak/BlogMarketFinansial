import { redirect } from 'next/navigation';

type Params = Promise<{ currency: string }>;

/**
 * /exchange-rates/[currency] — مسیر SEO قدیمی.
 *
 * H4-fix (2026-08-01): در publicRoutes هست ولی صفحه نداشت → 404 برای لینک‌های
 * قدیمی/SEO. حالا به مبدل زندهٔ /money-transfer با ارز prefill می‌رود تا
 * کاربر همان نرخ را در همان جا ببیند (جریان canonical نرخ‌ها).
 */
export default async function ExchangeRatesCurrencyPage({ params }: { params: Params }) {
  const { currency } = await params;
  const code = currency.toUpperCase();
  redirect(`/money-transfer?currency=${encodeURIComponent(code)}#rates`);
}
