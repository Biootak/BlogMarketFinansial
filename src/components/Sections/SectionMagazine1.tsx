import { getLatestPosts } from '@/actions/getLatestPosts';
import { getActiveAdvertisements } from '@/actions/advertisementActions';
import ClientSidePosts from './ClientSidePosts';
import type { Advertisement } from '@/types/types';

export interface SectionMagazine1Props {
  className?: string;
}

export default async function SectionMagazine1({ className = '' }: SectionMagazine1Props) {
  const initialPosts = await getLatestPosts();
  const mediumAdsResult = await getActiveAdvertisements({ limit: 10, size: 'MEDIUM' } ?? {});
  const initialAds: Advertisement[] = mediumAdsResult.success ? mediumAdsResult.data ?? [] : [];

  return (
    <div className={`nc-SectionMagazine1 ${className}`}>
      <ClientSidePosts initialPosts={initialPosts} initialAds={initialAds} />
    </div>
  );
}
