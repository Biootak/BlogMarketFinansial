import React from 'react';
import SectionLargeSlider from './SectionLargeSlider';
import SectionSliderNewCategories from '@/components/SectionSliderNewCategories/SectionSliderNewCategories';
import SectionMagazine1 from '@/components/Sections/SectionMagazine1';
import SectionAds from '@/components/Sections/SectionAds';
import SectionMagazine7 from '@/components/Sections/SectionMagazine7';

import SectionGridAuthorBox from '@/components/SectionGridAuthorBox/SectionGridAuthorBox';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';

import { getPosts } from '@/actions/getPosts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getActiveAdvertisements } from '@/actions/advertisementActions';

export default async function Home() {
  const [posts, topAuthors, adsResult] = await Promise.all([
    getPosts(),
    getTopAuthors(5),
    getActiveAdvertisements({ limit: 1, size: 'LARGE' }),
  ]);

  const latestLargeAd =
    adsResult.success && adsResult.data && adsResult.data.length > 0 ? adsResult.data[0] : null;

  return (
    <div className="nc-HomePage relative">
      <div className="container relative">
        <SectionLargeSlider />
        <SectionSliderNewCategories
          className="relative pb-16"
          heading="موضوعات پرطرفدار"
          subHeading="کشف موضوعات"
          categoryCardType="card2"
        />
        <SectionMagazine1 className="py-16 lg:py-28" />
        {latestLargeAd && <SectionAds className="pb-16 lg:pb-28" ad={latestLargeAd} />}
        <SectionMagazine7 className="py-16 lg:py-28" posts={posts} />
      </div>
      <div className="container">
        {/* <SectionMagazine8 className="py-16 lg:py-28" posts={DEMO_POSTS_AUDIO.slice(0, 6)} /> */}
        <SectionGridAuthorBox className="py-16 lg:py-28" authors={topAuthors} />
        <SectionSubscribe2 className="pt-16 lg:pt-28" />
      </div>
    </div>
  );
}
