import { getFeaturedPosts } from '@/actions/getFeaturedPosts';
import { getPosts } from '@/actions/getPosts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import CryptoTickerSection from '@/components/Sections/CryptoTickerSection';
import MarketRatesTickerSection from '@/components/Sections/MarketRatesTickerSection';
import PulseSection from '@/components/Sections/PulseBoard/PulseSection';
import SectionMagazine7 from '@/components/Sections/SectionMagazine7';
import { TopAuthorsSection } from '@/components/TopAuthorsSection';
import HeroSection from './HeroSection';
import SectionLargeSlider from './SectionLargeSlider';
import DeferredAdStrip from './deferred/DeferredAdStrip';
import DeferredTrending from './deferred/DeferredTrending';

// Dynamically rendered on demand: the shared site header (MainNav) reads
// auth() to render sign-in/avatar state, which opts the whole (site) tree out
// of static generation — so `revalidate` here would be a no-op. DB reads are
// deduped via safeCache; HTML is edge-cached via the s-maxage header in
// next.config.ts.
export default async function Home() {
  const [posts, topAuthors, firstStripResult, secondStripResult, categoriesResult, featuredResult] =
    await Promise.all([
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
      {lcpImage ? <link rel="preload" as="image" href={lcpImage} /> : null}

      {/* ── 3D Hero Section ─────────────────────────────── */}
      <div className="container relative">
        <HeroSection />
      </div>

      {/* ── Market Tickers ──────────────────────────────── */}
      <div className="container relative">
        <Suspense fallback={<Skeleton className="h-28 rounded-2xl" />}>
          <CryptoTickerSection />
        </Suspense>

        {/* نوار زنده‌ی نرخ‌های بازار — زیر نوار کریپتو، با سرعت متفاوت */}
        <MarketRatesTickerSection />

        <Suspense fallback={<CardLarge1Skeleton />}>
          <SectionLargeSlider />
        </Suspense>
      </div>

      {popularCategories.length > 0 && (
        <div className="container relative mt-4 lg:mt-5" style={{ minHeight: '320px' }}>
          <DeferredTrending
            categories={popularCategories}
            maxItems={9}
            title="موضوعات داغ"
            subtitle="پرطرفدارترین دسته‌بندی‌هایی که الان در بازار می‌درخشند"
            viewAllHref="/archive"
          />
        </div>
      )}

      <div className="container relative mt-4 lg:mt-6">
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
        <div className="container relative mt-4 lg:mt-6" style={{ minHeight: '300px' }}>
          <DeferredAdStrip ads={firstStrip} accentColor="#5b6cff" />
        </div>
      )}

      {posts.length > 0 && (
        <div className="container relative mt-4 lg:mt-6">
          <SectionMagazine7 className="" posts={posts} />
        </div>
      )}

      {secondStrip.length > 0 && (
        <div className="container relative mt-4 lg:mt-6" style={{ minHeight: '300px' }}>
          <DeferredAdStrip ads={secondStrip} accentColor="#22d3ee" eyebrow="تازه‌های پیشنهادی" />
        </div>
      )}

      {topAuthors.length > 0 && (
        <div className="container relative mt-4 lg:mt-6">
          <TopAuthorsSection className="" authors={topAuthors} />
        </div>
      )}

      <div className="container relative mt-4 lg:mt-6 mb-8 lg:mb-12">
        <SectionSubscribe2 className="" />
      </div>
    </div>
  );
}
