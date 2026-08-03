'use client';

import type { MarketRateItem } from '@/actions/marketRates';
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
  // LCP hero image must be in the initial SSR HTML so Next can emit a
  // <link rel="preload"> + fetchPriority="high" for it. `ssr:false` used to
  // keep ~46KB of JS out of the first bundle, but it made the LCP hero
  // render only after client hydration — pushing LCP to ~6s. Turning SSR
  // back on so the hero streams in the first paint. (Slight JS overhead is
  // worth the LCP win.)
  ssr: true,
});

export default function DeferredDesign7(props: DeferredDesign7Props) {
  return <Design7 {...props} />;
}
