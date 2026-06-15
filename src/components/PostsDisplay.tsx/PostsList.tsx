'use client';

/**
 * PostsList — نسخه ۲۰۲۶ (refined, CSS-driven)
 *
 * چیدمان:
 *  - 3 پست اول: Bento Asymmetric
 *  - بقیه: CSS columns masonry
 *
 * تکنیک‌ها (بدون framer-motion):
 *  1. CSS columns masonry واقعی
 *  2. Stagger از .stagger-children utility (globals.css)
 *  3. Tilt 3D از TiltCard
 *  4. Card hover reveal از group-hover (Tailwind)
 *  5. prefers-reduced-motion: global CSS rule
 */

import type { PostWithRelations } from '@/types/types';
import PostItem from './PostItem';
import FeaturedPostHero from './FeaturedPostHero';
import CompactPostCard from './CompactPostCard';
import { cn } from '@/lib/utils';

interface PostsListProps {
  posts: PostWithRelations[];
  className?: string;
}

const PostsList: React.FC<PostsListProps> = ({ posts, className = '' }) => {
  const hero = posts[0];
  const mini = posts.slice(1, 3);
  const rest = posts.slice(3);

  if (!hero) return null;

  return (
    <div className={cn('space-y-6 sm:space-y-8', className)}>
      <div className="stagger-children grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-4 lg:gap-5 xl:gap-6 items-stretch">
        <div className="md:col-span-7 lg:col-span-8 2xl:col-span-8 min-w-0 flex">
          <FeaturedPostHero post={hero} className="flex-1" />
        </div>

        {mini.length > 0 && (
          <div
            className={cn(
              'md:col-span-5 lg:col-span-4 2xl:col-span-4 min-w-0',
              'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-1',
              'gap-3 md:gap-3.5 lg:gap-4 xl:gap-5',
              'auto-rows-fr',
            )}
          >
            {mini.map((post) => (
              <div key={post.id} className="min-w-0 flex">
                <CompactPostCard post={post} className="flex-1 w-full" />
              </div>
            ))}
          </div>
        )}
      </div>

      {rest.length > 0 && (
        <div className="relative">
          <div
            className={cn(
              'columns-1 sm:columns-2 md:columns-2 lg:columns-3 xl:columns-3 2xl:columns-4',
              'gap-3 sm:gap-4 md:gap-4 lg:gap-5 xl:gap-6',
              '[&>*]:mb-3 sm:[&>*]:mb-4 md:[&>*]:mb-4 lg:[&>*]:mb-5 xl:[&>*]:mb-6',
              '[&>*]:break-inside-avoid',
              '[&>*]:inline-block [&>*]:w-full',
            )}
          >
            {rest.map((post) => (
              <PostItem key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostsList;
