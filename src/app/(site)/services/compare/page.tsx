/**
 * /services/compare — جدول مقایسه کامل خدمات صرافی‌ها.
 *
 *  لایه ۴ از ۴ لایه:
 *  - جدول feature-by-feature: محور = صرافی، ستون = سرویس
 *  - مشتری می‌تواند در یک نگاه ببیند کدام صرافی چه سرویس‌هایی ارائه می‌دهد
 *  - URL state: ?highlighted={slug} برای highlight یک صرافی (deep link از SubNav)
 *  - sortable: روی ستون‌های service و count قابل sort است
 *
 *  Pattern: Binance vs Kraken feature matrix (research).
 *  Counter signature moment: «X صرافی × Y سرویس = Z سرویس-صرافی»
 */

import { getComparisonMatrix } from '@/actions/exchange-services';
import type { Metadata } from 'next';
import ComparisonMatrixView from './_components/ComparisonMatrixView';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'مقایسه خدمات صرافی‌ها',
  description:
    'جدول مقایسه کامل خدمات آنلاین صرافی‌ها — یک نگاه، تمام تفاوت‌ها را ببینید.',
  openGraph: {
    title: 'مقایسه خدمات صرافی‌ها',
    description: 'کدام صرافی چه خدماتی آنلاین ارائه می‌دهد؟ در یک جدول ببینید.',
    type: 'website',
  },
};

type SearchParams = Promise<{
  exchange?: string;
  group?: string;
}>;

export default async function ServicesComparePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const matrix = await getComparisonMatrix();

  return (
    <ComparisonMatrixView
      matrix={matrix}
      initialExchange={sp.exchange}
      initialGroup={sp.group}
    />
  );
}
