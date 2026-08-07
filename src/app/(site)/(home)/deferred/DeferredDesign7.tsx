'use client';

import type { MarketRateItem } from '@/lib/market-rates';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';
import type { CryptoTickerRate, PostWithRelations, RateListData } from '@/types/types';
import dynamic from 'next/dynamic';

interface DeferredDesign7Props {
  initialPosts: PostWithRelations[];
  rates?: CryptoTickerRate[];
  marketRates?: MarketRateItem[];
  rateLists?: RateListData[];
  className?: string;
}

const Design7 = dynamic(() => import('../designs/Design7'), {
  loading: () => <CardLarge1Skeleton />,
  ssr: false,
});

export default function DeferredDesign7(props: DeferredDesign7Props) {
  return <Design7 {...props} />;
}
