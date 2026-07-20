import { getActiveAdvertisements } from '@/actions/advertisementActions';
import {
  type LatestPostCategory,
  getLatestPostCategories,
} from '@/actions/getLatestPostCategories';
import { getLatestPosts } from '@/actions/getLatestPosts';
import { getCryptoTickerData } from '@/actions/marketTickerActions';
import { Skeleton } from '@/components/ui/skeleton';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { Suspense } from 'react';
import ClientSidePosts from './ClientSidePosts';

export interface SectionMagazine1Props {
  className?: string;
}

/* ---------- Helpers ---------- */

/** نرمال‌سازی نام دسته برای مقایسه (حذف فاصله + کشیدگی + حروف کوچک فارسی) */
function normFa(s: string): string {
  return s
    .replace(/\s+/g, '')
    .replace(/[‌]/g, '') // ZWNJ
    .toLowerCase();
}

/** فیلتر کردن پست‌ها بر اساس category.slug (نه name) — تا با تفاوت نام/فاصله مشکل نخوره */
function filterByCategory(
  posts: PostWithRelations[],
  slugOrName: string,
  slugLookup: Map<string, string>, // normName -> slug
): PostWithRelations[] {
  if (slugOrName === 'همه') return posts;
  // اول سعی می‌کنیم به slug تبدیل کنیم
  const slug = slugLookup.get(normFa(slugOrName)) ?? slugOrName;
  return posts.filter((post) =>
    post.categories?.some((cat) => cat.slug === slug || normFa(cat.name) === normFa(slugOrName)),
  );
}

export default async function SectionMagazine1({ className = '' }: SectionMagazine1Props) {
  // 1) اول دسته‌ها رو می‌گیریم تا بدونیم چه category name هایی معتبرن
  const categoriesData: LatestPostCategory[] = await getLatestPostCategories();

  // Map normName -> slug برای فیلترینگ
  const slugLookup = new Map<string, string>();
  for (const c of categoriesData) {
    slugLookup.set(normFa(c.name), c.slug);
  }

  // 2) لیست تب‌ها — همیشه «همه» اول، بقیه بر اساس تعداد مقاله (DB ترتیب داده)
  const categoryNames: string[] = ['همه', ...categoriesData.map((c) => c.name)];

  // 3) پست‌های همه‌ی دسته‌ها به‌صورت موازی
  //    - «همه»: ۲۴ پست (compact view خوب کار کنه + صفحه‌بندی)
  //    - هر دسته: ۱۲ پست (برای infinite scroll)
  //    - همه‌ی صفحه‌ها یک اندازه هستن تا UI لگ نزنه
  const INITIAL_ALL = 24;
  const INITIAL_PER_CATEGORY = 24;
  const postsByCategoryPromises = categoryNames.map((name) =>
    name === 'همه'
      ? getLatestPosts({ count: INITIAL_ALL, skip: 0 })
      : getLatestPosts({
          count: INITIAL_PER_CATEGORY,
          skip: 0,
          category: name,
        }),
  );

  const [tickerData, mediumAdsResult, ...postsResults] = await Promise.all([
    getCryptoTickerData(),
    getActiveAdvertisements({ limit: 10, size: 'MEDIUM' }),
    ...postsByCategoryPromises,
  ]);

  const initialAds: Advertisement[] = mediumAdsResult.success ? (mediumAdsResult.data ?? []) : [];

  // 4) ساخت categorizedPosts — dedupe پست‌ها در «همه»
  const seen = new Set<string>();
  const allPosts: PostWithRelations[] = [];
  for (const list of [postsResults[0]]) {
    for (const p of list ?? []) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        allPosts.push(p);
      }
    }
  }

  const categorizedPosts: Record<string, PostWithRelations[]> = {};
  categorizedPosts.همه = allPosts;
  for (let i = 1; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    const list = (postsResults[i] as PostWithRelations[] | undefined) ?? [];
    categorizedPosts[name] = filterByCategory(list, name, slugLookup);
  }

  return (
    <div className={`nc-SectionMagazine1 ${className}`}>
      <Suspense fallback={<Skeleton className="h-[320px]" />}>
        <ClientSidePosts
          initialPosts={categorizedPosts}
          initialAds={initialAds}
          categoryNames={categoryNames}
          initialTickerData={tickerData}
          initialPageSize={INITIAL_ALL}
        />
      </Suspense>
    </div>
  );
}
