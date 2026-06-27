'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { Advertisement } from '@/types/types';

interface DeferredAdStripProps {
  ads: Advertisement[];
  accentColor?: string;
  eyebrow?: string;
  className?: string;
}

const AdCardStrip = dynamic(
  () => import('@/components/Sections/AdCardStrip').then((m) => m.AdCardStrip),
  { loading: () => <Skeleton className="h-[260px] sm:h-[300px] rounded-3xl" />, ssr: false },
);

export default function DeferredAdStrip(props: DeferredAdStripProps) {
  return <AdCardStrip {...props} />;
}
