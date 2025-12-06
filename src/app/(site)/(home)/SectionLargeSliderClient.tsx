'use client';

import dynamic from 'next/dynamic';
import type { PostWithRelations } from '@/types/types';

// Dynamic import for heavy Design7 component with framer-motion
const Design7 = dynamic(() => import('./designs/Design7'), {
  loading: () => (
    <div className="w-full h-[500px] animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-2xl" />
  ),
  ssr: false,
});

type Props = {
  initialPosts: PostWithRelations[];
  className?: string;
};

export default function SectionLargeSliderClient({ initialPosts, className = '' }: Props) {
  // طرح 7: سه‌بعدی
  return <Design7 initialPosts={initialPosts} className={className} />;
}
