import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getObservabilitySnapshot } from '@/lib/observability';
import { OverviewBoard } from './_components/OverviewBoard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'مرکز مشاهده‌پذیری',
  description: 'نمای زندهٔ سلامت سرویس‌ها، حجم رویداد و خطاهای ۲۴ ساعت گذشته.',
};

export default async function ObservabilityOverviewPage() {
  const result = await getObservabilitySnapshot();
  if (!result.success || !result.data) {
    redirect('/dashboard?error=forbidden');
  }

  return <OverviewBoard initialData={result.data} />;
}
