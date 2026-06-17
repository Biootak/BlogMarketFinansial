import BannerAds from '@/components/BannerADS/BannerADS';
import type { Advertisement, PostWithRelations } from '@/types/types';
import type * as React from 'react';
import { Fragment } from 'react';
import ArchiveCardV3 from './ArchiveCardV3';
import ArchiveFeaturedV3 from './ArchiveFeaturedV3';

type Props = {
  posts: PostWithRelations[];
  betweenPostsAd?: Advertisement | null;
};

/**
 * AnimatedPostGrid — نسخه v3
 * - featured اول + بقیه به صورت کارت
 * - list view به صورت ردیفی
 * - CSS-only سوئیچ بین دو حالت
 * - server component
 */
const AnimatedPostGridV3: React.FC<Props> = ({ posts, betweenPostsAd }) => {
  if (posts.length === 0) return null;

  const [featured, ...rest] = posts;
  const useFeatured = posts.length > 1;
  const featuredPost = useFeatured ? featured : null;
  const gridPosts = useFeatured ? rest : posts;
  const adAfterIndex = 4;

  return (
    <>
      {/* GRID VIEW */}
      <div className="arc-grid-view stagger-children arc-grid-magazine">
        {featuredPost ? (
          <div className="arc-grid-magazine__featured col-span-full">
            <ArchiveFeaturedV3 post={featuredPost} />
          </div>
        ) : null}
        {gridPosts.map((post, index) => (
          <Fragment key={post.id}>
            {betweenPostsAd && index === adAfterIndex ? (
              <div className="col-span-full my-2">
                <BannerAds ad={betweenPostsAd} variant="rich" />
              </div>
            ) : null}
            <div className="group h-full">
              <ArchiveCardV3 post={post} ratio="aspect-[4/3]" />
            </div>
          </Fragment>
        ))}
      </div>

      {/* LIST VIEW */}
      <div className="arc-list-view stagger-children arc-list-v3">
        {posts.map((post) => (
          <ArchiveCardV3 key={post.id} post={post} variant="list" />
        ))}
      </div>
    </>
  );
};

export default AnimatedPostGridV3;
