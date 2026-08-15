'use client';

import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';
import type { MarketRateItem } from '@/lib/market-rates';
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
  // 2026-08-15 (mobile LCP): عمداً بدون ssr:false — برخلاف deferred های پایین
  // صفحه، این hero slider بالای fold است و تصویر اصلی آن (priority) باید در
  // HTML استریم‌شده باشد تا LCP منتظر hydration نماند. motion-shim پروژه
  // SSR-safe است (plain DOM + CSS transitions) پس رندر اولیه یکسان است.
});

export default function DeferredDesign7(props: DeferredDesign7Props) {
  return <Design7 {...props} />;
}
