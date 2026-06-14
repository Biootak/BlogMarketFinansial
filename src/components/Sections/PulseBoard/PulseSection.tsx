import { getLatestPosts } from '@/actions/getLatestPosts';
import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getMarketTickerData } from '@/actions/marketTickerActions';
import { getLatestPostCategories } from '@/actions/getLatestPostCategories';
import { Skeleton } from '@/components/ui/skeleton';
import type { Advertisement, PostWithRelations } from '@/types/types';
import type { MarketTickerItem } from '@/actions/marketTickerActions';
import PulseBoard from './PulseBoard';

export interface PulseSectionProps {
  className?: string;
}

/* ---------- Helpers ---------- */

function normFa(s: string): string {
  return s.replace(/\s+/g, '').replace(/[‌]/g, '').toLowerCase();
}

function dedupeById(posts: PostWithRelations[]): PostWithRelations[] {
  const seen = new Set<string>();
  const out: PostWithRelations[] = [];
  for (const p of posts) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

export default async function PulseSection({ className = '' }: PulseSectionProps) {
  // 1) Categories — for filter chips
  const categoriesData = await getLatestPostCategories();
  const categoryNames: string[] = ['همه', ...categoriesData.map((c) => c.name)];

  // 2) Posts — یک صفحه‌ی بزرگ برای بازطراحی
  const INITIAL = 24;

  // 3) Ticker + Ads + Posts (موازی)
  const [tickerData, adsResult, latestPosts] = await Promise.all([
    getMarketTickerData(),
    getActiveAdvertisements({ limit: 2, size: 'MEDIUM' }),
    getLatestPosts({ count: INITIAL, skip: 0 }),
  ]);

  // برای total فعلاً از همون length استفاده می‌کنیم (انیمیشنی نمایش داده می‌شه)
  const totalCount = latestPosts.length;
  const posts: PostWithRelations[] = dedupeById(latestPosts);

  const initialAds: Advertisement[] = adsResult.success
    ? (adsResult.data ?? [])
    : [];

  return (
    <div className={`nc-PulseSection ${className}`}>
      <PulseBoard
        posts={posts}
        categoryNames={categoryNames}
        initialAds={initialAds}
        initialTickerData={tickerData}
        totalCount={totalCount}
      />
    </div>
  );
}

// Skeleton برای Suspense
export function PulseSectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-2xl" />
      <Skeleton className="h-[480px] w-full rounded-3xl" />
    </div>
  );
}
