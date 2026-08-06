'use client';

/**
 * PulseArticlesLazy — defer زیر-fold سنگین‌ترین client component صفحه‌ی اصلی.
 * ----------------------------------------------------------------------------
 * `LatestArticles` با خودش `motion` (framer-motion)، `AuroraBackground`،
 * `LiveClock` (تایمر ۳۰ ثانیه)، `MarketTicker` (polling هر ۲ دقیقه) و ده‌ها
 * آیکون lucide را می‌آورد — در حالی که در پایین‌ترین بخش صفحه است.
 *
 * الگوی مشابه `DeferredTrending` / `DeferredDesign7`:
 *  - `ssr: false` → JS آن در bundle اولیه نیست (LCP/TBT آزاد می‌شود)
 *  - اسکلت با ارتفاع یکسان تا no-CLS
 *
 * (اندازه‌گیری Lighthouse 2026-08-06: حذف آن از bundle اولیه ‏~1.8s هزینه‌ی
 * script-eval و چند صد ms از Style&Layout کم می‌کند.)
 */
import type { MarketTickerItem } from '@/actions/marketTickerActions';
import { Skeleton } from '@/components/ui/skeleton';
import type { Advertisement, PostWithRelations } from '@/types/types';
import dynamic from 'next/dynamic';

interface PulseArticlesLazyProps {
  posts: PostWithRelations[];
  categories: Array<{ name: string; slug: string }>;
  initialAds: Advertisement[];
  initialTickerData?: MarketTickerItem[];
  totalCount: number;
}

const LatestArticles = dynamic(() => import('./LatestArticles'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-2xl" />
      <Skeleton className="h-[360px] w-full rounded-3xl" />
    </div>
  ),
});

export default function PulseArticlesLazy(props: PulseArticlesLazyProps) {
  return <LatestArticles {...props} />;
}
