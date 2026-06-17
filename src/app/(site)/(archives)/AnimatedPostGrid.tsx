import BannerAds from '@/components/BannerADS/BannerADS';
import type { Advertisement, PostWithRelations } from '@/types/types';
import type React from 'react';
import { Fragment } from 'react';
import ArchiveCard11 from './ArchiveCard11';
import ArchiveHeroCard from './ArchiveHeroCard';
import ArchiveListRow from './ArchiveListRow';

type AnimatedPostGridProps = {
  posts: PostWithRelations[];
  betweenPostsAd?: Advertisement | null;
};

/**
 * Server-rendered post grid — 2026 v2.
 *
 * سه حالت:
 *  - Grid (پیش‌فرض): گرید magazine — کارت اول hero، بقیه ArchiveCard11.
 *  - List (با data-archive-view="list" روی <html>): همه‌ی پست‌ها به‌صورت ردیف فشرده.
 *  - بین دو حالت با CSS-only سوئیچ می‌شه؛ هیچ client JS لازم نیست.
 *
 * نکته: تبلیغ BETWEEN_POSTS فقط در grid نمایش داده می‌شه
 * (در list view جایگاه منطقی نداره).
 */
const AnimatedPostGrid: React.FC<AnimatedPostGridProps> = ({ posts, betweenPostsAd }) => {
  if (posts.length === 0) return null;

  // grid: اولین کارت featured می‌شه
  const [featured, ...rest] = posts;
  // اگه فقط یه پست داریم، featured نکنیم — همون grid معمولی کافیه
  const useFeatured = posts.length > 1;
  const featuredPost = useFeatured ? featured : null;
  const gridPosts = useFeatured ? rest : posts;
  // برای محاسبه‌ی index تبلیغ در grid (بعد از ۴ کارت غیر featured = اندیس ۴ در grid)
  const adAfterIndex = 4;

  return (
    <>
      {/* ====== GRID VIEW (default) ====== */}
      <div className="arc-grid-view stagger-children arc-grid-magazine">
        {featuredPost && (
          <div className="arc-grid-magazine__featured col-span-full">
            <ArchiveHeroCard post={featuredPost} />
          </div>
        )}
        {gridPosts.map((post, index) => (
          <Fragment key={post.id}>
            {betweenPostsAd && index === adAfterIndex && (
              <div className="col-span-full my-2">
                <BannerAds ad={betweenPostsAd} variant="rich" />
              </div>
            )}
            <div className="group h-full">
              <ArchiveCard11 post={post} />
            </div>
          </Fragment>
        ))}
      </div>

      {/* ====== LIST VIEW (compact) ====== */}
      <div className="arc-list-view stagger-children">
        {posts.map((post) => (
          <ArchiveListRow key={post.id} post={post} />
        ))}
      </div>
    </>
  );
};

export default AnimatedPostGrid;
