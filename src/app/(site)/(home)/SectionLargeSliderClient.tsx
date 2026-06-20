'use client';

// فعلاً طرح 7 رو نشون میدم
import Design7 from './designs/Design7';

import type { PostWithRelations, CryptoTickerRate, RateListData } from '@/types/types';
import type { MarketRateItem } from '@/actions/marketRates';
import type { NavasanRateItem } from '@/actions/navasanRates';

type Props = {
  initialPosts: PostWithRelations[];
  rates?: CryptoTickerRate[];
  marketRates?: MarketRateItem[];
  /** نرخ‌های مستقیم Navasan — مستقیم از API، بدون تبدیل واحد. */
  navasanRates?: NavasanRateItem[];
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
