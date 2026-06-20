'use client';

import dynamic from 'next/dynamic';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';
import type { PostWithRelations, CryptoTickerRate, RateListData } from '@/types/types';
import type { MarketRateItem } from '@/actions/marketRates';

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
