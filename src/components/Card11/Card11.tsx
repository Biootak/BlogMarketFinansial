'use client';

import React, { type FC, useMemo, useState } from 'react';
import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import type { PostWithRelations } from '@/types/types';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostCardLikeAndComment from '@/components/PostCardLikeAndComment/PostCardLikeAndComment';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import BookmarkCheck from '../BookmarkCheck';

export interface Card11Props {
  className?: string;
  post: PostWithRelations;
  ratio?: string;
  hiddenAuthor?: boolean;
}

const Card11: FC<Card11Props> = ({
  className = 'h-full',
  post,
  hiddenAuthor = false,
  ratio = 'aspect-w-4 aspect-h-3',
}) => {
  const { title, categories, createdAt, slug } = post;
  const [isHover, setIsHover] = useState(false);

  // Check if the post object exists and has necessary data
  if (!post || !post.slug) {
    return null; // Render nothing
  }

  return (
    <div
      className={`nc-Card11 relative flex flex-col group rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 ${className}`}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div
        className={`block flex-shrink-0 relative w-full rounded-t-3xl overflow-hidden z-10 ${ratio}`}
      >
        <div>
          <PostFeaturedMedia post={post} isHover={isHover} />
        </div>
      </div>
      <Link href={`/single/${slug}`} className="absolute inset-0 z-0" />
      <span className="absolute top-3 inset-x-3 z-10">
        <CategoryBadgeList categories={categories} />
      </span>

      <div className="p-4 flex flex-col space-y-3">
        {!hiddenAuthor ? (
          <PostCardMeta meta={post} />
        ) : (
          <span className="text-xs text-neutral-500">{createdAt.toString()}</span>
        )}
        <h3 className="nc-card-title block text-base font-semibold text-neutral-900 dark:text-neutral-100">
          <span className="line-clamp-2" title={title}>
            {title}
          </span>
        </h3>
        <div className="flex items-end justify-between mt-auto">
          <PostCardLikeAndComment className="relative" post={post} />
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
      </div>
    </div>
  );
};

export default Card11;
