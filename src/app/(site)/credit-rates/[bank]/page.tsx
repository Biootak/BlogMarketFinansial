import { redirect } from 'next/navigation';

type Params = Promise<{ bank: string }>;

/**
 * /credit-rates/[bank] — مسیر SEO قدیمی.
 *
 * H7-fix: قبلاً دو-hop به /credit-rates → /archive می‌رفت. حالا به صفحهٔ واقعی
 * نرخ‌های اعتباری با اشاره به بانک می‌رود.
 */
export default async function CreditRatesBankPage({ params }: { params: Params }) {
  const { bank } = await params;
  redirect(`/credit-rates?bank=${encodeURIComponent(bank)}`);
}
