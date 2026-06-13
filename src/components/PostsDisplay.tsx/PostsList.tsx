'use client';

/**
 * PostsList — نسخه ۲۰۲۶ (refined)
 *
 * چیدمان (فول ریسپانسیو):
 *  - 3 پست اول: Bento Asymmetric
 *      - < sm : 1 col (hero بالا، 2 mini زیر هم)
 *      - sm-md: 1 col (mini کنار هم 2col در عرض کم)
 *      - md  : 12col بento (7/5)
 *      - lg  : 12col بento (8/4)
 *      - 2xl : 12col بento (9/3)
 *  - بقیه: CSS columns masonry
 *      - < sm : 1 col
 *      - sm  : 2 col
 *      - xl  : 3 col
 *      - 2xl : 4 col
 *
 * تکنیک‌ها:
 *  1. CSS columns (masonry واقعی)
 *  2. Stagger container (هر کارت 50ms تأخیر)
 *  3. Tilt 3D subtle
 *  4. Parallax تصویر hero
 *  5. Card hover reveal: meta slide-up
 *  6. Respects prefers-reduced-motion
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { PostWithRelations } from '@/types/types';
import PostItem from './PostItem';
import FeaturedPostHero from './FeaturedPostHero';
import CompactPostCard from './CompactPostCard';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/motion';

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
      {/* ============================================================== */}
      {/*  Bento Top: 1 Hero + 2 Mini (asymmetric responsive)            */}
      {/* ============================================================== */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-4 lg:gap-5 xl:gap-6 items-stretch"
      >
        {/* Hero - responsive column span */}
        <motion.div
          variants={staggerItem}
          className="md:col-span-7 lg:col-span-8 2xl:col-span-8 min-w-0 flex"
        >
          <FeaturedPostHero post={hero} className="flex-1" />
        </motion.div>

        {/* Mini - 2 col on small, 1 col on lg+ */}
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
              <motion.div key={post.id} variants={staggerItem} className="min-w-0 flex">
                <CompactPostCard post={post} className="flex-1 w-full" />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ============================================================== */}
      {/*  Rest: CSS columns masonry (1 → 2 → 3 → 4 col)                  */}
      {/* ============================================================== */}
      {rest.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative"
        >
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
              <motion.div key={post.id} variants={staggerItem}>
                <PostItem post={post} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PostsList;