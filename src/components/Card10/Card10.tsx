'use client';

import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostCardInfo from '@/components/PostCardInfo/PostCardInfo';
import PostCardMetaV2 from '@/components/PostCardMeta/PostCardMetaV2';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import { getPostLink } from '@/lib/getPostLink';
import type { PostWithRelations } from '@/types/types';
import Link from 'next/link';
import React, { type FC, useState } from 'react';

export interface Card10Props {
  className?: string;
  post: PostWithRelations;
}

const Card10: FC<Card10Props> = ({ className = 'h-full', post }) => {
  const { categories, slug, postType, viewCount, readingTime, createdAt } = post;
  const [isHover, setIsHover] = useState(false);

  return (
    <div
      className={`nc-Card10 relative flex flex-col transition-shadow duration-200 hover:shadow-lg ${className}`}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <Link href={getPostLink(postType, slug)} className="absolute inset-0" />
      <div className="block group rounded-xl sm:rounded-2xl lg:rounded-3xl flex-shrink-0 relative w-full aspect-[4/3] sm:aspect-[9/8] overflow-hidden z-0">
        <div>
          <PostFeaturedMedia post={post} isHover={isHover} />
        </div>

        <Link
          href={getPostLink(postType, slug)}
          className="absolute inset-0 bg-neutral-900 bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
      <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 flex justify-between items-start gap-2 sm:gap-4 z-10">
        <CategoryBadgeList categories={categories} className="flex flex-wrap gap-1" />
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 shadow-lg">
          <PostCardInfo
            views={viewCount}
            readingTime={readingTime}
            showViews={true}
            showReadingTime={true}
            compact={true}
          />
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2.5 mt-2 sm:mt-4 px-1">
        <PostCardMetaV2 meta={post} />
      </div>
    </div>
  );
};

export default Card10;
