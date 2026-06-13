'use client';

/**
 * PostsList — نسخه ۲۰۲۶ (refined)
 *
 * چیدمان:
 *  - 3 پست اول: Bento Asymmetric — 1 hero (8col) + 2 mini (4col)
 *  - بقیه: 2-col masonry با CSS columns
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
      {/*  Bento Top: 1 Hero + 2 Mini (asymmetric 8/4 grid)             */}
      {/* ============================================================== */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6"
      >
        {/* Hero - 8 cols */}
        <motion.div
          variants={staggerItem}
          className="lg:col-span-8"
        >
          <FeaturedPostHero post={hero} />
        </motion.div>

        {/* Mini - 4 cols, stack of 2 */}
        {mini.length > 0 && (
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-5 lg:gap-6">
            {mini.map((post) => (
              <motion.div key={post.id} variants={staggerItem}>
                <CompactPostCard post={post} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ============================================================== */}
      {/*  Rest: 2-col CSS columns masonry                               */}
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
              'columns-1 sm:columns-2 gap-4 sm:gap-5 lg:gap-6',
              '[&>*]:mb-4 sm:[&>*]:mb-5 lg:[&>*]:mb-6',
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
