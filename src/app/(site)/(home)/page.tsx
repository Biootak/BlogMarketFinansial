import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import SectionLargeSlider from './SectionLargeSlider';
import SectionMagazine1 from '@/components/Sections/SectionMagazine1';
import SectionAds from '@/components/Sections/SectionAds';
import SectionMagazine7 from '@/components/Sections/SectionMagazine7';
import SectionGridAuthorBox from '@/components/SectionGridAuthorBox/SectionGridAuthorBox';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import { getPosts } from '@/actions/getPosts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getActiveAdvertisements } from '@/actions/advertisementActions';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';
import SectionSliderNewCategories from '@/components/SectionSliderNewCategories/SectionSliderNewCategories';
import { SectionExchangeRates } from '@/components/Sections/SectionExchangeRates';

export default async function Home() {
  const [posts, topAuthors, adsResult] = await Promise.all([
    getPosts(6),
    getTopAuthors(5),
    getActiveAdvertisements({ limit: 1, size: 'LARGE' }),
  ]);

  const latestLargeAd =
    adsResult.success && adsResult.data && adsResult.data.length > 0 ? adsResult.data[0] : null;

  return (
    <div className="nc-HomePage relative">
      <div className="container relative">
        <Suspense fallback={<Skeleton className="h-[400px]" />}>
          <SectionExchangeRates />
        </Suspense>
        <Suspense fallback={<CardLarge1Skeleton />}>
          <SectionLargeSlider />
        </Suspense>
        <SectionSliderNewCategories
          className="relative pb-16"
          heading="موضوعات پرطرفدار"
          subHeading="کشف موضوعات"
          categoryCardType="card2"
        />
        <SectionMagazine1 className="py-16 lg:py-28" />
        {latestLargeAd ? (
          <SectionAds className="pb-16 lg:pb-28" ad={latestLargeAd} />
        ) : (
          <Skeleton className="pb-16 lg:pb-28 h-64 rounded-md" />
        )}
        {posts.length > 0 ? (
          <SectionMagazine7 className="py-16 lg:py-28" posts={posts} />
        ) : (
          <div className="py-16 lg:py-28 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={(i + 1).toString()} className="h-64 rounded-md" />
            ))}
          </div>
        )}
      </div>
      <div className="container">
        {topAuthors.length > 0 ? (
          <SectionGridAuthorBox className="py-16 lg:py-28" authors={topAuthors} />
        ) : (
          <div className="py-16 lg:py-28 grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={(i + 1).toString()} className="h-48 rounded-md" />
            ))}
          </div>
        )}
        <SectionSubscribe2 className="pt-16 lg:pt-28" />
      </div>
    </div>
  );
}
