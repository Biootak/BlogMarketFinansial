import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/actions/postActions';
import { getRelatedPosts } from '@/actions/getRelatedPosts';
import { getMoreFromAuthor } from '@/actions/getMoreFromAuthor';
import SingleHeader from '@/app/(site)/(singles)/SingleHeader';
import SingleContent from '@/app/(site)/(singles)/SingleContent';
import SingleRelatedPosts from '@/app/(site)/(singles)/SingleRelatedPosts';
import NcImage from '@/components/NcImage/NcImage';
import { getSidebarData } from '@/actions/sidebarActions';
import type { PostWithRelations, ActionResult } from '@/types/types';
import Sidebar from '../../../Sidebar';
import { getActiveAdvertisements } from '@/actions/advertisementActions';

export interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function PageSingle({ params }: PageProps) {
  const { slug } = await params;
  const postSlug = slug?.join('/') || '';
  const result = await getPostBySlug(postSlug);

  if (!result.success || !result.data) {
    notFound();
  }

  const post = result.data;

  const relatedPostsPromise: Promise<ActionResult<PostWithRelations[]>> = getRelatedPosts(
    post.id,
    post.categories.map((cat) => cat.id),
  );
  const moreFromAuthorPromise: Promise<ActionResult<PostWithRelations[]>> = getMoreFromAuthor(
    post.authorId,
    post.id,
  );
  const sidebarData = await getSidebarData();
  const sidebarAdsResult = await getActiveAdvertisements({
    limit: 3,
    size: 'MEDIUM',
    position: 'SIDEBAR',
    orderBy: 'createdAt',
    orderDirection: 'desc',
  });

  return (
    <div className="nc-PageSingle pt-4 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-2/3 pr-0 lg:pr-6">
            <header className="rounded-xl p-2">
              <SingleHeader post={post} />
            </header>

            <div className="relative aspect-video rounded-xl overflow-hidden my-2">
              <NcImage
                alt={post.title}
                className="w-full rounded-xl"
                src={
                  post.featuredImage ||
                  'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg'
                }
                width={1260}
                height={750}
                sizes="(max-width: 1024px) 100vw, 1280px"
                fill={false}
              />
            </div>

            <SingleContent post={post} />
          </div>
          <div className="w-full lg:w-1/3 mt-8 lg:mt-0">
            <div className="sticky top-24">
              <Sidebar
                ads={sidebarAdsResult.success && sidebarAdsResult.data ? sidebarAdsResult.data : []}
                className="space-y-6"
                widgetPosts={sidebarData.recentPosts}
                tags={sidebarData.popularTags}
                categories={sidebarData.popularCategories}
                authors={sidebarData.popularAuthors}
              />
            </div>
          </div>
        </div>

        <div className="mt-12 w-full">
          <SingleRelatedPosts
            post={post}
            relatedPostsPromise={relatedPostsPromise}
            moreFromAuthorPromise={moreFromAuthorPromise}
          />
        </div>
      </div>
    </div>
  );
}
