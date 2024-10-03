'use client';

import type React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import type { PostWithRelations } from '@/types/types';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostCardLikeAndComment from '@/components/PostCardLikeAndComment/PostCardLikeAndComment';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import BookmarkCheck from '../BookmarkCheck';
import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import { getPostLink } from '@/lib/getPostLink';

export interface Card11Props {
  className?: string;
  post: PostWithRelations;
  ratio?: string;
  hiddenAuthor?: boolean;
}

const Card11: React.FC<Card11Props> = ({
  className = 'h-full',
  post,
  hiddenAuthor = false,
  ratio = 'aspect-w-4 aspect-h-3',
}) => {
  const { title, categories, createdAt, slug, postType } = post;
  const [isHover, setIsHover] = useState(false);

  if (!post || !post.slug) {
    return null;
  }

  return (
    <div
      className={`nc-Card11 relative flex flex-col group rounded-2xl overflow-hidden bg-white dark:bg-neutral-800 ${className} transition-all duration-300 hover:shadow-lg hover:shadow-neutral-300/50 dark:hover:shadow-black/30 border border-neutral-200 dark:border-neutral-700`}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div className={`block flex-shrink-0 relative w-full rounded-t-2xl overflow-hidden ${ratio}`}>
        <div>
          <PostFeaturedMedia post={post} isHover={isHover} />
        </div>
      </div>
      <Link href={getPostLink(postType, slug)} className="absolute inset-0 z-0" />
      <span className="absolute top-4 left-4 z-10">
        <CategoryBadgeList categories={categories} />
      </span>

      <div className="p-5 flex flex-col space-y-4">
        {!hiddenAuthor ? (
          <PostCardMeta meta={post} />
        ) : (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {createdAt.toString()}
          </span>
        )}
        <h3 className="nc-card-title block text-lg font-semibold text-neutral-900 dark:text-neutral-100 transition-colors duration-300 hover:text-primary dark:hover:text-primary-dark">
          <span className="line-clamp-2" title={title}>
            {title}
          </span>
        </h3>
        <div className="flex items-end justify-between mt-auto pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <PostCardLikeAndComment className="relative" post={post} />
          <BookmarkCheck post={post}>
            {(isBookmarked) => (
              <PostCardSaveAction
                className="relative"
                postId={post.id}
                initialBookmarked={isBookmarked}
                bookmarkClass="h-9 w-9 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors duration-300 rounded-full"
              />
            )}
          </BookmarkCheck>
        </div>
      </div>
    </div>
  );
};

export default Card11;
