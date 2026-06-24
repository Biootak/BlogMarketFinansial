'use client';

import React, { type FC, useState } from 'react';
import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import PostCardMetaV2 from '@/components/PostCardMeta/PostCardMetaV2';
import Link from 'next/link';
import type { PostWithRelations } from '@/types/types';
import BookmarkCheck from '../BookmarkCheck';
import { getPostLink } from '@/lib/getPostLink';

export interface Card10Props {
  className?: string;
  post: PostWithRelations;
}

const Card10: FC<Card10Props> = ({ className = 'h-full', post }) => {
  const { categories, slug, postType } = post;
  const [isHover, setIsHover] = useState(false);

  return (
    <div
      className={`nc-Card10 relative flex flex-col transition-shadow duration-300 hover:shadow-lg ${className}`}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <Link href={getPostLink(postType, slug)} className="absolute inset-0" tabIndex={-1} />
      <div className="block group rounded-xl sm:rounded-2xl flex-shrink-0 relative w-full aspect-[16/10] sm:aspect-[3/2] overflow-hidden z-0">
        <div>
          <PostFeaturedMedia post={post} isHover={isHover} />
        </div>


      </div>
      <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 flex justify-between items-start gap-2 sm:gap-4 z-10">
        <CategoryBadgeList categories={categories} className="flex flex-wrap gap-1" />
        <BookmarkCheck post={post}>
          {(isBookmarked) => (
            <PostCardSaveAction
              className="relative"
              postId={post.id}
              initialBookmarked={isBookmarked}
              bookmarkClass="h-6 w-6 sm:h-8 sm:w-8 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            />
          )}
        </BookmarkCheck>
      </div>

      <div className="space-y-1.5 sm:space-y-2 mt-2 sm:mt-4 px-1">
        <PostCardMetaV2 meta={post} />
      </div>
    </div>
  );
};

export default Card10;
