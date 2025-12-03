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
      <Link href={getPostLink(postType, slug)} className="absolute inset-0" />
      <div className="block group rounded-3xl flex-shrink-0 relative w-full aspect-[9/7] sm:aspect-[9/9] overflow-hidden z-0">
        <div>
          <PostFeaturedMedia post={post} isHover={isHover} />
        </div>

        <Link
          href={getPostLink(postType, slug)}
          className="absolute inset-0 bg-neutral-900 bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
      <div className="absolute top-3 inset-x-3 flex justify-between items-start gap-4 z-10">
        <CategoryBadgeList categories={categories} />
        <BookmarkCheck post={post}>
          {(isBookmarked) => (
            <PostCardSaveAction
              className="relative"
              postId={post.id}
              initialBookmarked={isBookmarked}
              bookmarkClass="h-8 w-8 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            />
          )}
        </BookmarkCheck>
      </div>

      <div className="space-y-2.5 rtl:space-x-reverse mt-4">
        <PostCardMetaV2 meta={post} />
      </div>
    </div>
  );
};

export default Card10;
