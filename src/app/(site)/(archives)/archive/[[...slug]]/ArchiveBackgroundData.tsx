import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { getTopAuthors } from '@/actions/getTopAuthors';

interface ArchiveBackgroundDataProps {
  children: (data: {
    categories: any[];
    tags: any[];
    topAuthors: any[];
    betweenPostsAds: any[];
  }) => React.ReactNode;
}

export async function ArchiveBackgroundData({ children }: ArchiveBackgroundDataProps) {
  const [categoriesResult, tagsResult, topAuthorsResult, betweenPostsAdsResult] =
    await Promise.all([
      getCategories({ limit: 12, page: 1 }),
      getTags({ limit: 12, page: 1 }),
      getTopAuthors(5),
      getActiveAdvertisements({
        limit: 6,
        position: 'BETWEEN_POSTS',
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }),
    ]);

  const categories = categoriesResult.data?.categories || [];
  const tags = tagsResult.data?.tags || [];
  const topAuthors = topAuthorsResult || [];
  const betweenPostsAds =
    betweenPostsAdsResult.success && Array.isArray(betweenPostsAdsResult.data)
      ? betweenPostsAdsResult.data
      : [];

  return (
    <>
      {children({
        categories,
        tags,
        topAuthors,
        betweenPostsAds,
      })}
    </>
  );
}
