import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { getPosts } from '@/actions/getPosts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getActiveAdvertisements } from '@/actions/advertisementActions';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';

// Dynamic imports for heavy components
const SectionLargeSlider = dynamic(() => import('./SectionLargeSlider'), { 
  loading: () => <CardLarge1Skeleton />,
  ssr: true 
});
const SectionMagazine7 = dynamic(() => import('@/components/Sections/SectionMagazine7'), {
  loading: () => <Skeleton className="h-[400px] rounded-3xl" />,
  ssr: true
});
const SectionGridAuthorBox = dynamic(() => import('@/components/SectionGridAuthorBox/SectionGridAuthorBox'), {
  loading: () => <Skeleton className="h-[400px] rounded-3xl" />,
  ssr: true
});

// Regular imports for lighter components
import SectionMagazine1 from '@/components/Sections/SectionMagazine1';
import SectionAds from '@/components/Sections/SectionAds';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import ModernTrendingTopics from '@/components/ModernTrending';
import SectionExchangeRates from '@/components/Sections/SectionExchangeRates';
import { getCategories } from '@/actions/categoryActions';

export default async function Home() {
  const [posts, topAuthors, firstAdResult, secondAdResult, categoriesResult] = await Promise.all([
    getPosts(6),
    getTopAuthors(5),
    getActiveAdvertisements({
      limit: 1,
      size: 'LARGE',
      position: 'CUSTOM',
      orderBy: 'order',
      orderDirection: 'asc',
    }),
    getActiveAdvertisements({
      limit: 1,
      size: 'LARGE',
      position: 'CUSTOM',
      orderBy: 'order',
      orderDirection: 'asc',
      page: 2,
    }),
    getCategories({ limit: 8 }),
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
            title="موضوعات پرطرفدار"
            subtitle="داغ‌ترین ترندهای بازار — به‌روزرسانی لحظه‌ای"
            viewAllHref="/archive"
          />
        </div>
      )}

      {/* Latest Posts Section */}
      <div className="container relative mt-8 lg:mt-12">
        <SectionMagazine1 className="" />
      </div>

      {/* First Ad */}
      {firstAd && (
        <div className="container relative mt-8 lg:mt-12">
          <SectionAds className="" ad={firstAd} />
        </div>
      )}

      {/* Gallery Posts Section */}
      {posts.length > 0 && (
        <div className="container relative mt-8 lg:mt-12">
          <SectionMagazine7 className="" posts={posts} />
        </div>
      )}

      {/* Second Ad */}
      {secondAd && (
        <div className="container relative mt-8 lg:mt-12">
          <SectionAds className="" ad={secondAd} />
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
