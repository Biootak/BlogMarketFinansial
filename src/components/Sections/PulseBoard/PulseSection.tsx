import { getLatestPosts } from '@/actions/getLatestPosts';
import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getMarketTickerData } from '@/actions/marketTickerActions';
import { getLatestPostCategories } from '@/actions/getLatestPostCategories';
import { Skeleton } from '@/components/ui/skeleton';
import type { Advertisement, PostWithRelations } from '@/types/types';
import prisma from '@/lib/db';
import LatestArticles from './LatestArticles';

/* ---------- Helpers ---------- */

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

export interface PulseSectionProps {
  className?: string;
}

export default async function PulseSection({ className = '' }: PulseSectionProps) {
  // 1) Categories — for filter chips
  const categoriesData = await getLatestPostCategories();
  const categories = [
    { name: 'همه', slug: 'all' },
    ...categoriesData.map((c) => ({ name: c.name, slug: c.slug })),
  ];

  // 2) Posts — یک صفحه‌ی بزرگ برای بازطراحی
  // 24 پست = 9 اولیه + 3 دست 10 تایی آماده (بدون round-trip شبکه)
  const INITIAL = 24;

  // 3) Ticker + Ads + Posts (موازی)
  const [tickerData, adsResult, latestPosts, totalCount] = await Promise.all([
    getMarketTickerData(),
    getActiveAdvertisements({ limit: 2, size: 'MEDIUM' }),
    getLatestPosts({ count: INITIAL, skip: 0 }),
    prisma.post.count({
      where: {
        status: 'PUBLISHED',
        featuredImage: {
          not: null,
        },
        AND: [
          { featuredImage: { not: '' } },
          { featuredImage: { not: ' ' } },
        ],
      },
    }),
  ]);

  const posts: PostWithRelations[] = dedupeById(latestPosts);
  const initialAds: Advertisement[] = adsResult.success ? (adsResult.data ?? []) : [];

  return (
    <div className={`nc-PulseSection ${className}`}>
      <LatestArticles
        posts={posts}
        categories={categories}
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
