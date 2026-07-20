'use client';

/**
 * PostItem — نسخه ۲۰۲۶ (CSS-driven, no framer-motion)
 *
 * - Tilt 3D subtle از TiltCard
 * - Hover lift با CSS transform
 * - Image scale روی hover
 * - Stagger entrance از parent
 * - ARIA roles + keyboard accessible
 */

import { Shimmer } from '@/components/ModernTrending/effects/Shimmer';
import { TiltCard } from '@/components/ModernTrending/effects/TiltCard';
import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import Card6 from '../Card6/Card6';

interface PostItemProps {
  post: PostWithRelations;
  isLarge?: boolean;
  className?: string;
}

const PostItem: React.FC<PostItemProps> = ({ post, isLarge = false, className }) => {
  return (
    <div className={cn('w-full anim-fade-in-up', className)}>
      <TiltCard intensity={3} perspective={1400} className="w-full">
        <div className="relative hover:-translate-y-0.5 transition-transform duration-300">
          {isLarge ? <FeaturedCardFrame post={post} /> : <Card6 post={post} />}
        </div>
      </TiltCard>
    </div>
  );
};

function FeaturedCardFrame({ post }: { post: PostWithRelations }) {
  return (
    <div className="relative">
      <Card6 post={post} />
      <Shimmer className="rounded-2xl" />
    </div>
  );
}

export default PostItem;
