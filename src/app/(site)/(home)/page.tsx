import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getPosts } from '@/actions/getPosts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getFeaturedPosts } from '@/actions/getFeaturedPosts';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';

import SectionLargeSlider from './SectionLargeSlider';
import SectionMagazine7 from '@/components/Sections/SectionMagazine7';
import SectionExchangeRates from '@/components/Sections/SectionExchangeRates';
import { TopAuthorsSection } from '@/components/TopAuthorsSection';
import PulseSection from '@/components/Sections/PulseBoard/PulseSection';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import DeferredTrending from './deferred/DeferredTrending';
import DeferredAdStrip from './deferred/DeferredAdStrip';

export const revalidate = 60;

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

  const firstStrip =
    firstStripResult.success && firstStripResult.data ? firstStripResult.data : [];
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
        <Suspense fallback={<Skeleton className="h-28 rounded-2xl" />}>
          <SectionExchangeRates />
        </Suspense>

        <Suspense fallback={<CardLarge1Skeleton />}>
          <SectionLargeSlider />
        </Suspense>
      </div>

      {popularCategories.length > 0 && (
        <div className="container relative mt-8 lg:mt-12" style={{ minHeight: '420px' }}>
          <DeferredTrending
            categories={popularCategories}
            maxItems={9}
            title="موضوعات پرطرفدار"
            subtitle="این دسته‌بندیها الان بیشتر از همه خونده میشن"
            viewAllHref="/archive"
          />
        </div>
      )}

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

      {firstStrip.length > 0 && (
        <div className="container relative mt-8 lg:mt-12" style={{ minHeight: '300px' }}>
          <DeferredAdStrip ads={firstStrip} accentColor="#5b6cff" />
        </div>
      )}

      {posts.length > 0 && (
        <div className="container relative mt-8 lg:mt-12">
          <SectionMagazine7 className="" posts={posts} />
        </div>
      )}

      {secondStrip.length > 0 && (
        <div className="container relative mt-8 lg:mt-12" style={{ minHeight: '300px' }}>
          <DeferredAdStrip ads={secondStrip} accentColor="#22d3ee" eyebrow="پیشنهاد اخیر" />
        </div>
      )}

      {topAuthors.length > 0 && (
        <div className="container relative mt-8 lg:mt-12">
          <TopAuthorsSection className="" authors={topAuthors} />
        </div>
      )}

      <div className="container relative mt-8 lg:mt-12 mb-10 lg:mb-16">
        <SectionSubscribe2 className="" />
      </div>
    </div>
  );
}
