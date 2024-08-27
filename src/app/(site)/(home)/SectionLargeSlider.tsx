import { cache } from 'react';
import { getFeaturedPosts } from '@/actions/getFeaturedPosts';

import type { PostWithRelations, ActionResult } from '@/types/types';
import SectionLargeSliderClient from './SectionLargeSliderClient';

const getFeaturedPostsCached = cache(getFeaturedPosts);

export default async function SectionLargeSlider() {
  const result: ActionResult<PostWithRelations[]> = await getFeaturedPostsCached(3);

  

  return (
    <SectionLargeSliderClient
      initialPosts={result.data }
      autoSlide={true}
      className="pt-10 pb-16 md:py-16 lg:pb-28 lg:pt-5"
    />
  );
}
