'use client';

/**
 * PostItem — نسخه ۲۰۲۶
 *
 * تکنیک‌ها:
 *  1. Tilt 3D بسیار subtle (3 درجه، فقط دسکتاپ)
 *  2. Hover lift (y: -3px)
 *  3. Image scale on hover
 *  4. Shimmer line (فقط featured)
 *  5. ARIA roles + keyboard accessible
 *
 * استفاده از Card6 موجود — فقط wrap با Tilt.
 */

import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import type { PostWithRelations } from '@/types/types';
import { TiltCard } from '@/components/ModernTrending/effects/TiltCard';
import { Shimmer } from '@/components/ModernTrending/effects/Shimmer';
import { STRIPE_EASE, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import Card6 from '../Card6/Card6';

interface PostItemProps {
  post: PostWithRelations;
  isLarge?: boolean;
  className?: string;
}

const PostItem: React.FC<PostItemProps> = ({ post, isLarge = false, className }) => {
  return (
    <motion.div
      variants={staggerItem}
      className={cn('w-full', className)}
    >
      <TiltCard intensity={3} perspective={1400} className="w-full">
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.3, ease: STRIPE_EASE }}
          className="relative"
        >
          {isLarge ? (
            <FeaturedCardFrame post={post} />
          ) : (
            <Card6 post={post} />
          )}
        </motion.div>
      </TiltCard>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Featured frame (حالا featured در PostsList جداست — این فقط fallback)     */
/* -------------------------------------------------------------------------- */

function FeaturedCardFrame({ post }: { post: PostWithRelations }) {
  return (
    <div className="relative">
      <Card6 post={post} />
      <Shimmer className="rounded-2xl" />
    </div>
  );
}

export default PostItem;
