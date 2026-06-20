'use client';

import Design7 from './designs/Design7';
import type { PostWithRelations, CryptoTickerRate, RateListData } from '@/types/types';
import type { MarketRateItem } from '@/actions/marketRates';

type Props = {
  initialPosts: PostWithRelations[];
  rates?: CryptoTickerRate[];
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
