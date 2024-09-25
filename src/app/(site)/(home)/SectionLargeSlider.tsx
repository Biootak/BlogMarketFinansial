import { cache } from 'react';
import { getFeaturedPosts } from '@/actions/getFeaturedPosts';

import type { PostWithRelations, ActionResult } from '@/types/types';
import SectionLargeSliderClient from './SectionLargeSliderClient';
import { Skeleton } from '@/components/ui/skeleton';
import Empty from '@/components/Empty';

const getFeaturedPostsCached = cache(getFeaturedPosts);

export default async function SectionLargeSlider() {
  const result: ActionResult<PostWithRelations[]> = await getFeaturedPostsCached(3);

  if (result.error) {
    // اگر خطایی رخ داده باشد، می‌توانید آن را مدیریت کنید
    console.error('Error fetching featured posts:', result.error);
    return <Empty />;
  }

  if (!result.data || result.data.length === 0) {
    return <Empty />;
  }

  return (
    <div>
      <SectionLargeSliderClient
        initialPosts={result.data}
        autoSlide={true}
        className="pt-10 pb-16 md:py-16 lg:pb-28 lg:pt-5"
      />
    </div>
  );
}
