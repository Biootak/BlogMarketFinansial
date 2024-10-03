import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import PostCardMeta from '../PostCardMeta/PostCardMeta';

import type { PostWithRelations } from '@/types/types';

import PostCardLikeAndComment from '../PostCardLikeAndComment/PostCardLikeAndComment';
import PostCardSaveAction from '../PostCardSaveAction/PostCardSaveAction';

import BookmarkCheck from '../BookmarkCheck';

interface Card2Props {
  className?: string;
  post: PostWithRelations;
  size?: 'normal' | 'large';
}

export default function Card2({ className = 'h-full', size = 'normal', post }: Card2Props) {
  const { title, featuredImage, categories, postType, slug, excerpt } = post;

  return (
    <div
      className={`nc-Card2 group relative flex flex-col ${className} bg-white dark:bg-neutral-800 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 border border-neutral-200 dark:border-neutral-700`}
    >
      <div className="block flex-shrink-0 flex-grow relative w-full h-0 pt-[75%] sm:pt-[55%] z-0 rounded-t-xl overflow-hidden">
        <Image
          fill
          sizes="(max-width: 600px) 480px, 800px"
          className="object-cover"
          src={featuredImage || '/images/placeholder-small.jpg'}
          alt={title}
        />
        <PostTypeFeaturedIcon
          className="absolute bottom-2 right-2"
          postType={postType}
          wrapSize="w-8 h-8"
          iconSize="w-4 h-4"
        />
        <CategoryBadgeList
          className="flex flex-wrap space-x-reverse space-x-2 absolute top-3 right-3 "
          itemClass="relative"
          categories={categories}
        />
      </div>

      <Link href={`/single/${slug}`} className="absolute inset-0" />

      <div className="p-4 flex flex-col flex-grow">
        <div className="space-y-3 mb-4">
          <PostCardMeta className="relative text-sm" avatarSize="h-8 w-8 text-sm" meta={post} />

          <h2
            className={`nc-card-title block font-semibold text-neutral-900 dark:text-neutral-100 ${
              size === 'large' ? 'text-base sm:text-lg md:text-xl' : 'text-base'
            }`}
          >
            <Link href={`/single/${slug}`} className="line-clamp-2" title={title}>
              {title}
            </Link>
          </h2>
          <span className="block text-neutral-500 dark:text-neutral-400 text-sm leading-6 line-clamp-2">
            {excerpt}
          </span>
        </div>
        <div className="mt-auto pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <BookmarkCheck post={post}>
              {(isBookmarked) => (
                <PostCardSaveAction
                  className="relative"
                  postId={post.id}
                  initialBookmarked={isBookmarked}
                  bookmarkClass="h-8 w-8 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                />
              )}
            </BookmarkCheck>
            <PostCardLikeAndComment className="relative" post={post} />
          </div>
        </div>
      </div>
    </div>
  );
}
