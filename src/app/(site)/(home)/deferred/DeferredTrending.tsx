'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaxonomyType } from '@/types/types';

interface DeferredTrendingProps {
  categories: TaxonomyType[];
  maxItems?: number;
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
  className?: string;
}

const ModernTrendingTopics = dynamic(
  () => import('@/components/ModernTrending/ModernTrendingTopics').then((m) => m.default),
  { loading: () => <Skeleton className="h-[420px] rounded-3xl" /> },
);

export default function DeferredTrending(props: DeferredTrendingProps) {
  return <ModernTrendingTopics {...props} />;
}
