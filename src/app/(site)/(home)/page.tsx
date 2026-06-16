import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { getPosts } from '@/actions/getPosts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';

// Dynamic imports for heavy components — تمام section هایی که فریم-ورک
// سمت کلاینت (framer-motion، state، effect) دارن اینجا لود می‌شن تا main
// thread برای HTML اولیه آزاد بشه. همه با ssr:true هستن تا SEO و LCP
// رندر سمت سرور داشته باشن، ولی کدشون به یه chunk جداگانه split می‌شه.
const SectionLargeSlider = dynamic(() => import('./SectionLargeSlider'), {
  loading: () => <CardLarge1Skeleton />,
  ssr: true,
});
const SectionMagazine7 = dynamic(() => import('@/components/Sections/SectionMagazine7'), {
  loading: () => <Skeleton className="h-[400px] rounded-3xl" />,
  ssr: true,
});
const SectionGridAuthorBox = dynamic(
  () => import('@/components/TopAuthorsSection').then((m) => m.TopAuthorsSection),
  { loading: () => <Skeleton className="h-[400px] rounded-3xl" />, ssr: true },
);
const ModernTrendingTopics = dynamic(
  () => import('@/components/ModernTrending/ModernTrendingTopics').then((m) => m.default),
  { loading: () => <Skeleton className="h-[420px] rounded-3xl" />, ssr: true },
);
const SectionSubscribe2 = dynamic(
  () => import('@/components/SectionSubscribe2/SectionSubscribe2'),
  { loading: () => <Skeleton className="h-[280px] rounded-3xl" />, ssr: true },
);
const PulseSection = dynamic(
  () => import('@/components/Sections/PulseBoard/PulseSection').then((m) => m.default),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-2xl" />
        <Skeleton className="h-[480px] w-full rounded-3xl" />
      </div>
    ),
    ssr: true,
  },
);
const SectionExchangeRates = dynamic(
  () => import('@/components/Sections/SectionExchangeRates'),
  { loading: () => <Skeleton className="h-28 rounded-2xl" />, ssr: true },
);
const SectionAds = dynamic(() => import('@/components/Sections/SectionAds'), {
  loading: () => <Skeleton className="h-[150px] lg:h-[250px] rounded-3xl" />,
  ssr: true,
});

export default async function Home() {
  const [posts, topAuthors, firstAdResult, secondAdResult, categoriesResult] = await Promise.all([
    getPosts(6),
    getTopAuthors(5),
    // Ads برای SectionAds بین اسلایدها
    import('@/actions/advertisementActions').then((m) =>
      m.getActiveAdvertisements({
        limit: 1,
        size: 'LARGE',
        position: 'CUSTOM',
        orderBy: 'order',
        orderDirection: 'asc',
      }),
    ),
    import('@/actions/advertisementActions').then((m) =>
      m.getActiveAdvertisements({
        limit: 1,
        size: 'LARGE',
        position: 'CUSTOM',
        orderBy: 'order',
        orderDirection: 'asc',
        page: 2,
      }),
    ),
    import('@/actions/categoryActions').then((m) => m.getPopularCategoriesForHome(16)),
  ]);

  const popularCategories =
    categoriesResult.success && categoriesResult.data?.categories
      ? categoriesResult.data.categories.filter((c) => c.count > 0)
      : [];

  const firstAd =
    firstAdResult.success && firstAdResult.data && firstAdResult.data.length > 0
      ? firstAdResult.data[0]
      : null;
  const secondAd =
    secondAdResult.success && secondAdResult.data && secondAdResult.data.length > 0
      ? secondAdResult.data[0]
      : null;

  return (
    <div className="nc-HomePage relative">
      {/* Hero Section */}
      <div className="container relative">
        {/* Exchange Rates */}
        <Suspense fallback={<Skeleton className="h-28 rounded-2xl" />}>
          <SectionExchangeRates />
        </Suspense>

        {/* Featured Slider */}
        <Suspense fallback={<CardLarge1Skeleton />}>
          <SectionLargeSlider />
        </Suspense>
      </div>

      {/* Trending Topics Section — نسخه ۲۰۲۶ */}
      {popularCategories.length > 0 && (
        <div className="container relative mt-8 lg:mt-12">
          <ModernTrendingTopics
            categories={popularCategories}
            maxItems={9}
            title="موضوعات پرطرفدار"
            subtitle="این دسته‌بندی‌ها الان بیشتر از همه خونده می‌شن"
            viewAllHref="/archive"
          />
        </div>
      )}

      {/* Latest Posts Section — بازطراحی PulseBoard (نسخه ۲۰۲۶) */}
      <div className="container relative mt-8 lg:mt-12">
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

      {/* First Ad — spotlight hero */}
      {firstAd && (
        <div className="container relative mt-8 lg:mt-12">
          <SectionAds className="" ad={firstAd} variant="spotlight" />
        </div>
      )}

      {/* Gallery Posts Section */}
      {posts.length > 0 && (
        <div className="container relative mt-8 lg:mt-12">
          <SectionMagazine7 className="" posts={posts} />
        </div>
      )}

      {/* Second Ad — rich split card */}
      {secondAd && (
        <div className="container relative mt-8 lg:mt-12">
          <SectionAds className="" ad={secondAd} variant="rich" />
        </div>
      )}

      {/* Top Authors Section */}
      {topAuthors.length > 0 && (
        <div className="container relative mt-8 lg:mt-12">
          <SectionGridAuthorBox className="" authors={topAuthors} />
        </div>
      )}

      {/* Newsletter Section */}
      <div className="container relative mt-8 lg:mt-12 mb-10 lg:mb-16">
        <SectionSubscribe2 className="" />
      </div>
    </div>
  );
}
