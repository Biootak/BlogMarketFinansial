import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getObservabilitySnapshot } from '@/lib/observability';
import { ErrorBoard } from '../_components/ErrorBoard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'خطا و رخداد — مرکز پایش',
  description: 'جریان خطای گروه‌بندی‌شده، پنجره‌های رخداد و رد ممیزی ۲۴ ساعت گذشته.',
};

export default async function ObservabilityErrorsPage() {
  const result = await getObservabilitySnapshot();
  if (!result.success || !result.data) {
    redirect('/dashboard?error=forbidden');
  }

  return <ErrorBoard initialData={result.data} />;
}
