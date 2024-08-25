import { getFeaturedPosts } from '@/actions/getFeaturedPosts';

import type { PostWithRelations, ActionResult } from '@/types/types';
import SectionLargeSliderClient from './SectionLargeSliderClient';

export const revalidate = 3600; // revalidate every hour

export default async function SectionLargeSliderServer() {
  const result: ActionResult<PostWithRelations[]> = await getFeaturedPosts(3);

  if (!result.success || !result.data) {
    throw new Error(result.message || 'خطا در دریافت پست‌های ویژه');
  }

  return (
    <SectionLargeSliderClient
      initialPosts={result.data}
      autoSlide={true}
      className="pt-10 pb-16 md:py-16 lg:pb-28 lg:pt-5"
    />
  );
}
