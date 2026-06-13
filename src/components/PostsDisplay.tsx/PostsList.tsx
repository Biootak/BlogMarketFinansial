'use client';

/**
 * PostsList — نسخه ۲۰۲۶
 *
 * چیدمان Bento:
 *  - پست اول (featured) — کارت افقی بزرگ با تصویر سمت راست (RTL)، متن در سمت چپ
 *  - بقیه پست‌ها — masonry دو ستونه با کارت‌های عمودی یکدست
 *
 * تکنیک‌ها:
 *  1. CSS columns (masonry واقعی، نه تخصیص دستی)
 *  2. Stagger container (هر کارت با 50ms تأخیر)
 *  3. Tilt 3D (فقط روی دسکتاپ)
 *  4. Respects prefers-reduced-motion
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { PostWithRelations } from '@/types/types';
import PostItem from './PostItem';
import FeaturedPostHero from './FeaturedPostHero';
import { cn } from '@/lib/utils';
import { STRIPE_EASE, staggerContainer, staggerItem } from '@/lib/motion';

interface PostsListProps {
  posts: PostWithRelations[];
  className?: string;
}

const PostsList: React.FC<PostsListProps> = ({ posts, className = '' }) => {
  const [featured, ...rest] = posts;

  // اگه فقط یک پست بود، همون featured تنها نمایش داده می‌شه
  const hasRest = rest.length > 0;

  // توزیع masonry: به جای تقسیم دستی، از CSS columns استفاده می‌کنیم
  // برای ستون‌بندی طبیعی
  const restItems = useMemo(() => rest, [rest]);

  if (!featured) {
    return null;
  }

  return (
    <div className={cn('space-y-6 sm:space-y-8', className)}>
      {/* Featured hero */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem}>
          <FeaturedPostHero post={featured} />
        </motion.div>
      </motion.div>

      {/* Rest in 2-col masonry */}
      {hasRest && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative"
        >
          <div
            className={cn(
              // columns masonry
              'columns-1 sm:columns-2 gap-4 sm:gap-5 lg:gap-6',
              '[&>*]:mb-4 sm:[&>*]:mb-5 lg:[&>*]:mb-6',
              '[&>*]:break-inside-avoid',
              '[&>*]:inline-block [&>*]:w-full',
            )}
          >
            {restItems.map((post) => (
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
