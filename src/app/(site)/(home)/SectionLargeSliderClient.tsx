'use client';

// فعلاً طرح 7 رو نشون میدم
import Design7 from './designs/Design7';

import type { PostWithRelations, ExchangeRate, RateListData } from '@/types/types';
import type { MarketRateItem } from '@/actions/marketTickerRates';

type Props = {
  initialPosts: PostWithRelations[];
  rates?: ExchangeRate[];
  marketRates?: MarketRateItem[];
  rateLists?: RateListData[];
  className?: string;
};

export default function SectionLargeSliderClient({
  initialPosts,
  rates,
  marketRates,
  rateLists,
  className = '',
}: Props) {
  // طرح 7: سه‌بعدی
  return (
    <Design7
      initialPosts={initialPosts}
      rates={rates}
      marketRates={marketRates}
      rateLists={rateLists}
      className={className}
    />
  );
}
