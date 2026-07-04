import { getFeaturedPosts } from '@/actions/getFeaturedPosts';
import { getPosts } from '@/actions/getPosts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getMarketRates } from '@/actions/market-rates';
import MarketRatesTicker from '@/components/MarketRates/MarketRatesTicker';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import CryptoTickerSection from '@/components/Sections/CryptoTickerSection';
import PulseSection from '@/components/Sections/PulseBoard/PulseSection';
import SectionMagazine7 from '@/components/Sections/SectionMagazine7';
import { TopAuthorsSection } from '@/components/TopAuthorsSection';
import SectionLargeSlider from './SectionLargeSlider';
import DeferredAdStrip from './deferred/DeferredAdStrip';
import DeferredTrending from './deferred/DeferredTrending';

// Dynamically rendered on demand: the shared site header (MainNav) reads
// auth() to render sign-in/avatar state, which opts the whole (site) tree out
// of static generation — so `revalidate` here would be a no-op. DB reads are
// deduped via safeCache; HTML is edge-cached via the s-maxage header in
// next.config.ts.
export default async function Home() {
  const [
    posts,
    topAuthors,
    firstStripResult,
    secondStripResult,
    categoriesResult,
    featuredResult,
    marketRates,
  ] = await Promise.all([
    getPosts(6),
    getTopAuthors(5),
    import('@/actions/advertisementActions').then((m) =>
      m.getActiveAdvertisements({
        limit: 4,
        size: 'LARGE',
        position: 'CUSTOM',
        orderBy: 'order',
        orderDirection: 'asc',
      }),
    ),
    import('@/actions/advertisementActions').then((m) =>
      m.getActiveAdvertisements({
        limit: 3,
        size: 'MEDIUM',
        position: 'CUSTOM',
        orderBy: 'order',
        orderDirection: 'asc',
        page: 2,
      }),
    ),
    import('@/actions/categoryActions').then((m) => m.getPopularCategoriesForHome(16)),
    getFeaturedPosts(1),
    getMarketRates(),
  ]);

  const popularCategories =
    categoriesResult.success && categoriesResult.data?.categories
      ? categoriesResult.data.categories.filter((c) => c.count > 0)
      : [];

  const firstStrip = firstStripResult.success && firstStripResult.data ? firstStripResult.data : [];
  const secondStrip =
    secondStripResult.success && secondStripResult.data ? secondStripResult.data : [];

  const lcpImage = featuredResult?.data?.[0]?.featuredImage;

  return (
    <div className="nc-HomePage relative">
      {lcpImage ? (
        <link
          rel="preload"
          as="image"
          href={lcpImage}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: not applicable
        />
      ) : null}
      <div className="container relative">
        {/* Market rates ticker (TGJU + USDT + FX) — shared with dashboard. */}
        <MarketRatesTicker rates={marketRates} variant="homepage" label="بازارها" />

        <Suspense fallback={<Skeleton className="h-28 rounded-2xl" />}>
          <CryptoTickerSection />
        </Suspense>

        <Suspense fallback={<CardLarge1Skeleton />}>
          <SectionLargeSlider />
        </Suspense>
      </div>

      {popularCategories.length > 0 && (
        <div className="container relative mt-6 lg:mt-8" style={{ minHeight: '420px' }}>
          <DeferredTrending
            categories={popularCategories}
            maxItems={9}
            title="موضوعات داغ"
            subtitle="پرطرفدارترین دسته‌بندی‌هایی که الان در بازار می‌درخشند"
            viewAllHref="/archive"
          />
        </div>
      )}

      <div className="container relative mt-6 lg:mt-8">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-[480px] w-full rounded-3xl" />
            </div>
          }
        >
          <PulseSection />
        </Suspense>
      </div>

      {firstStrip.length > 0 && (
        <div className="container relative mt-6 lg:mt-8" style={{ minHeight: '300px' }}>
          <DeferredAdStrip ads={firstStrip} accentColor="#5b6cff" />
        </div>
      )}

      {posts.length > 0 && (
        <div className="container relative mt-6 lg:mt-8">
          <SectionMagazine7 className="" posts={posts} />
        </div>
      )}

      {secondStrip.length > 0 && (
        <div className="container relative mt-6 lg:mt-8" style={{ minHeight: '300px' }}>
          <DeferredAdStrip ads={secondStrip} accentColor="#22d3ee" eyebrow="تازه‌های پیشنهادی" />
        </div>
      )}

      {topAuthors.length > 0 && (
        <div className="container relative mt-6 lg:mt-8">
          <TopAuthorsSection className="" authors={topAuthors} />
        </div>
      )}

      <div className="container relative mt-6 lg:mt-8 mb-8 lg:mb-12">
        <SectionSubscribe2 className="" />
      </div>
    </div>
  );
}
