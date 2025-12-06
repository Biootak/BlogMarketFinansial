import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getLatestPosts } from '@/actions/getLatestPosts';
import { Skeleton } from '@/components/ui/skeleton';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { Suspense } from 'react';
import ClientSidePosts from './ClientSidePosts';

export interface SectionMagazine1Props {
  className?: string;
}

const CATEGORIES = ['همه', 'طلا', 'ارز دیجیتال', 'بازار جهانی'];

export default async function SectionMagazine1({ className = '' }: SectionMagazine1Props) {
  const [allPosts, mediumAdsResult] = await Promise.all([
    getLatestPosts({ count: 6 }),
    getActiveAdvertisements({ limit: 10, size: 'MEDIUM' }),
  ]);

  const initialAds: Advertisement[] = mediumAdsResult.success ? (mediumAdsResult.data ?? []) : [];

  const categorizedPosts: Record<string, PostWithRelations[]> = {
    همه: allPosts,
    طلا: allPosts.filter((post) => post.categories.some((cat) => cat.name === 'طلا')),
    'ارز دیجیتال': allPosts.filter((post) =>
      post.categories.some((cat) => cat.name === 'ارز های دیجیتال'),
    ),
    'بازار جهانی': allPosts.filter((post) =>
      post.categories.some((cat) => cat.name === 'بازار جهانی'),
    ),
  };

  return (
    <div className={`nc-SectionMagazine1 ${className}`}>
      <Suspense fallback={<Skeleton className="h-[400px]" />}>
        <ClientSidePosts
          initialPosts={categorizedPosts}
          initialAds={initialAds}
          categories={CATEGORIES}
        />
      </Suspense>
    </div>
  );
}
