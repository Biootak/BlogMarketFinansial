'use client';

// فعلاً طرح 7 رو نشون میدم
import Design7 from './designs/Design7';

import type { PostWithRelations, ExchangeRate, RateListData } from '@/types/types';
import type { MarketRateItem } from '@/actions/marketTickerRates';
import type { NavasanTickerItem } from '@/actions/navasanTickerRates';

type Props = {
  initialPosts: PostWithRelations[];
  rates?: ExchangeRate[];
  marketRates?: MarketRateItem[];
  /** نرخ‌های مستقیم Navasan — مستقیم از API، بدون تبدیل واحد. */
  navasanRates?: NavasanTickerItem[];
  rateLists?: RateListData[];
  className?: string;
};

export default function SectionLargeSliderClient({
  initialPosts,
  rates,
  marketRates,
  navasanRates,
  rateLists,
  className = '',
}: Props) {
  // طرح 7: سه‌بعدی
  return (
    <Design7
      initialPosts={initialPosts}
      rates={rates}
      marketRates={marketRates}
      navasanRates={navasanRates}
      rateLists={rateLists}
      className={className}
    />
  );
}
