import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getLatestPostCategories } from '@/actions/getLatestPostCategories';
import { getLatestPosts, getPublishedPostCount } from '@/actions/getLatestPosts';
import { getCryptoTickerData } from '@/actions/marketTickerActions';
import { Skeleton } from '@/components/ui/skeleton';
import type { Advertisement, PostWithRelations } from '@/types/types';
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
  // 24 پست = 9 اولیه + 3 دست 10 تایی آماده (بدون round-trip شبکه)
  const INITIAL = 24;

  // 2026-06-19: همه‌ی واکشی‌ها (شامل categories و totalCount) در یک
  // Promise.all. قبلاً categories جدا awaited می‌شد و totalCount یک
  // uncached `prisma.post.count` بود — یعنی هر رندر home دو round-trip
  // اضافه به DB (Neon cross-region) می‌زد. حالا categories از قبل cached
  // است و totalCount از `getPublishedPostCount` (unstable_cache) میاد.
  const [tickerData, adsResult, latestPosts, totalCount, categoriesData] =
    await Promise.all([
      getCryptoTickerData(),
      getActiveAdvertisements({ limit: 5 }),
      getLatestPosts({ count: INITIAL, skip: 0 }),
      getPublishedPostCount(),
      getLatestPostCategories(),
    ]);

  const categories = [
    { name: 'همه', slug: 'all' },
    ...categoriesData.map((c) => ({ name: c.name, slug: c.slug })),
  ];

  const posts: PostWithRelations[] = dedupeById(latestPosts);
  const initialAds: Advertisement[] = adsResult.success ? (adsResult.data ?? []) : [];

  // 2026-06-20: getCryptoTickerData فقط crypto برمی‌گردونه، پس فیلتر
  // دیگر لازم نیست. نام مستعار برای خوانایی مصرف‌کننده پایین نگه داشته شد.
  const cryptoTickerData = tickerData;

  return (
    <div className={`nc-PulseSection ${className}`}>
      <LatestArticles
        posts={posts}
        categories={categories}
        initialAds={initialAds}
        initialTickerData={cryptoTickerData}
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
      <Skeleton className="h-[360px] w-full rounded-3xl" />
    </div>
  );
}
