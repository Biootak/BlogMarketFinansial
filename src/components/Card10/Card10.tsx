'use client';

import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostCardMetaV2 from '@/components/PostCardMeta/PostCardMetaV2';
import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import { getPostLink } from '@/lib/getPostLink';
import type { PostWithRelations } from '@/types/types';
import Link from 'next/link';
import { type FC, useState } from 'react';
import BookmarkCheck from '../BookmarkCheck';

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
      {/* لینک تزئینی - فقط برای کلیک mouse است؛ از a11y tree خارج است */}
      <Link
        href={getPostLink(postType, slug)}
        className="absolute inset-0"
        tabIndex={-1}
        aria-hidden="true"
      />
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
              // target-size: html font-size (--fs-base) scales rem by ~0.76, so
              // h-8 (32px) renders at 24.4px actual — meets the 24px target.
              bookmarkClass="h-8 w-8 sm:h-9 sm:w-9 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
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
