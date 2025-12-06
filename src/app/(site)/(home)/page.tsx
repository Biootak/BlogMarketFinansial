import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getPosts } from '@/actions/getPosts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';

// Dynamic imports for heavy components
const SectionLargeSlider = dynamic(() => import('./SectionLargeSlider'), {
  loading: () => <CardLarge1Skeleton />,
  ssr: true,
});
const SectionMagazine7 = dynamic(() => import('@/components/Sections/SectionMagazine7'), {
  loading: () => <Skeleton className="h-[400px] rounded-3xl" />,
  ssr: true,
});
const SectionGridAuthorBox = dynamic(
  () => import('@/components/SectionGridAuthorBox/SectionGridAuthorBox'),
  {
    loading: () => <Skeleton className="h-[400px] rounded-3xl" />,
    ssr: true,
  },
);

import SectionSliderNewCategories from '@/components/SectionSliderNewCategories/SectionSliderNewCategories';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import SectionAds from '@/components/Sections/SectionAds';
import SectionExchangeRates from '@/components/Sections/SectionExchangeRates';
// Regular imports for lighter components
import SectionMagazine1 from '@/components/Sections/SectionMagazine1';

export default async function Home() {
  const [posts, topAuthors, firstAdResult, secondAdResult] = await Promise.all([
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
  ]);

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

      {/* Categories Section */}
      <div className="container relative mt-8 lg:mt-12">
        <SectionSliderNewCategories
          className="relative"
          heading="موضوعات پرطرفدار"
          subHeading="کشف موضوعات"
          categoryCardType="card2"
        />
      </div>

      {/* Latest Posts Section */}
      <div className="container relative mt-10 lg:mt-14">
        <SectionMagazine1 className="" />
      </div>

      {/* First Ad */}
      {firstAd && (
        <div className="container relative mt-10 lg:mt-14">
          <SectionAds className="" ad={firstAd} />
        </div>
      )}

      {/* Gallery Posts Section */}
      {posts.length > 0 && (
        <div className="container relative mt-10 lg:mt-14">
          <SectionMagazine7 className="" posts={posts} />
        </div>
      )}

      {/* Second Ad */}
      {secondAd && (
        <div className="container relative mt-10 lg:mt-14">
          <SectionAds className="" ad={secondAd} />
        </div>
      )}

      {/* Top Authors Section */}
      {topAuthors.length > 0 && (
        <div className="container relative mt-10 lg:mt-14">
          <SectionGridAuthorBox className="" authors={topAuthors} />
        </div>
      )}

      {/* Newsletter Section */}
      <div className="container relative mt-12 lg:mt-20 mb-10 lg:mb-16">
        <SectionSubscribe2 className="" />
      </div>
    </div>
  );
}
