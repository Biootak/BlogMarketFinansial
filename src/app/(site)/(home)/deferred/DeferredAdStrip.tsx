'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { Advertisement } from '@/types/types';
import dynamic from 'next/dynamic';

interface DeferredAdStripProps {
  ads: Advertisement[];
  accentColor?: string;
  eyebrow?: string;
  className?: string;
}

const AdCardStrip = dynamic(
  () => import('@/components/Sections/AdCardStrip').then((m) => m.AdCardStrip),
  {
    loading: () => <Skeleton className="h-[260px] sm:h-[300px] rounded-3xl" />,
    // Below the fold (mid-page ad strips) — keep out of initial bundle.
    ssr: false,
  },
);

export default function DeferredAdStrip(props: DeferredAdStripProps) {
  return <AdCardStrip {...props} />;
}
