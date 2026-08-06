import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getObservabilitySnapshot } from '@/lib/observability';
import { QueryBoard } from '../_components/QueryBoard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'کوئری کند — مرکز پایش',
  description: 'عملیات کند شش ساعت گذشته و منابع پرحجم لاگ.',
};

export default async function ObservabilityQueriesPage() {
  const result = await getObservabilitySnapshot();
  if (!result.success || !result.data) {
    redirect('/dashboard?error=forbidden');
  }

  return <QueryBoard initialData={result.data} />;
}
