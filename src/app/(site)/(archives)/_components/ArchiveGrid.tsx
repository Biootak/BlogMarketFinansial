import BannerAds from '@/components/BannerADS/BannerADS';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { Fragment } from 'react';
import ArchiveCard from './ArchiveCard';
import ArchiveFeatured from './ArchiveFeatured';

type Props = {
  posts: PostWithRelations[];
  betweenPostsAd?: Advertisement | null;
};

/**
 * ArchiveGrid — چیدمان اصلی صفحه‌ی Archive
 * - grid mode: featured در ابتدا + auto-fit grid
 * - list mode: همه‌ی پست‌ها در یک ستون (ArchiveCard variant="list")
 * - CSS-only mode-switch با [data-archive-view] روی <html>
 */
const ArchiveGrid: React.FC<Props> = ({ posts, betweenPostsAd }) => {
  if (posts.length === 0) return null;

  const [featured, ...rest] = posts;
  const useFeatured = posts.length > 1;
  const featuredPost = useFeatured ? featured : null;
  const gridPosts = useFeatured ? rest : posts;
  const adAfterIndex = 4;

  return (
    <>
      {/* GRID VIEW */}
      <div className="archive-grid-view archive-grid">
        {featuredPost ? (
          <div className="archive-grid__featured">
            <ArchiveFeatured post={featuredPost} />
          </div>
        ) : null}
        {gridPosts.map((post, index) => (
          <Fragment key={post.id}>
            {betweenPostsAd && index === adAfterIndex ? (
              <div className="archive-grid__ad">
                <BannerAds ad={betweenPostsAd} variant="rich" />
              </div>
            ) : null}
            <ArchiveCard post={post} ratio="4/3" />
          </Fragment>
        ))}
      </div>

      {/* LIST VIEW */}
      <div className="archive-list-view">
        {posts.map((post) => (
          <ArchiveCard key={post.id} post={post} variant="list" />
        ))}
      </div>
    </>
  );
};

export default ArchiveGrid;
