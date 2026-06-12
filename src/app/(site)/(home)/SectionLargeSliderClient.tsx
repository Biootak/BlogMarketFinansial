'use client';

// فعلاً طرح 7 رو نشون میدم
import Design7 from './designs/Design7';

import type { PostWithRelations, ExchangeRate, RateListData } from '@/types/types';

type Props = {
  initialPosts: PostWithRelations[];
  rates?: ExchangeRate[];
  rateLists?: RateListData[];
  className?: string;
};

export default function SectionLargeSliderClient({
  initialPosts,
  rates,
  rateLists,
  className = '',
}: Props) {
  // طرح 7: سه‌بعدی
  return (
    <Design7
      initialPosts={initialPosts}
      rates={rates}
      rateLists={rateLists}
      className={className}
    />
  );
}
