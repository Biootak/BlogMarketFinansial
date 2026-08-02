'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { TaxonomyType } from '@/types/types';
import dynamic from 'next/dynamic';

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
  {
    loading: () => <Skeleton className="h-[420px] rounded-3xl" />,
    // Below the fold on the home page — keep its JS out of the initial
    // client bundle.
    ssr: false,
  },
);

export default function DeferredTrending(props: DeferredTrendingProps) {
  return <ModernTrendingTopics {...props} />;
}
