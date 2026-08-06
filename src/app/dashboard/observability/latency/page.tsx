import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getObservabilitySnapshot } from '@/lib/observability';
import { LatencyBoard } from '../_components/LatencyBoard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'تأخیر — مرکز پایش',
  description: 'صدک‌های پاسخ‌گویی و تأخیر هر سرویس بر پایهٔ لاگ‌های duration.',
};

export default async function ObservabilityLatencyPage() {
  const result = await getObservabilitySnapshot();
  if (!result.success || !result.data) {
    redirect('/dashboard?error=forbidden');
  }

  return <LatencyBoard initialData={result.data} />;
}
