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
 * ArchiveGrid — چیدمان اصلی صفحه‌ی Archive (نسخه ۲۰۲۶)
 * - چیدمان مجله‌ای: featured (2 ستون) + دو کارت کنار (هرکدوم 1 ستون) در یک ردیف
 * - بقیه‌ی کارت‌ها در 4 ستون برابر
 * - grid mode تنها (list view حذف شد)
 */
const ArchiveGrid: React.FC<Props> = ({ posts, betweenPostsAd }) => {
  if (posts.length === 0) return null;

  const [first, second, third, ...rest] = posts;
  const hasTopRow = posts.length >= 2;
  const featuredPost = hasTopRow ? first : null;
  const sidePost = hasTopRow ? second : null;
  const sidePost2 = posts.length >= 3 ? third : null;
  const gridPosts = hasTopRow ? rest : posts;
  const adAfterIndex = 4;

  return (
    <>
      <div className="archive-grid-view arc-grid-hero-3col">
        {/* Top row: featured (2 col) + side post (1 col) */}
        {featuredPost ? (
          <div className="arc-grid-hero-3col__featured" data-arc-reveal-v4>
            <ArchiveFeatured post={featuredPost} />
          </div>
        ) : null}
        {sidePost ? (
          <div className="arc-grid-hero-3col__side" data-arc-reveal-v4>
            <ArchiveCard post={sidePost} ratio="3/4" priority />
          </div>
        ) : null}
        {sidePost2 ? (
          <div className="arc-grid-hero-3col__side" data-arc-reveal-v4>
            <ArchiveCard post={sidePost2} ratio="3/4" />
          </div>
        ) : null}

        {/* 4-col grid برای بقیه */}
        {gridPosts.map((post, index) => (
          <Fragment key={post.id}>
            {betweenPostsAd && index === adAfterIndex ? (
              <div className="arc-grid-hero-3col__ad" data-arc-reveal-v4>
                <BannerAds ad={betweenPostsAd} variant="rich" />
              </div>
            ) : null}
            <div className="arc-grid-hero-3col__cell" data-arc-reveal-v4>
              <ArchiveCard post={post} ratio="4/3" />
            </div>
          </Fragment>
        ))}
      </div>
    </>
  );
};

export default ArchiveGrid;
