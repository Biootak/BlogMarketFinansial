import React from 'react';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import type { PostWithRelations } from '@/types/types';
import PostCardLikeAndComment from '@/components/PostCardLikeAndComment/PostCardLikeAndComment';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import Link from 'next/link';
import Image from 'next/image';
import BookmarkCheck from '../BookmarkCheck';
import { getPostLink } from '@/lib/getPostLink';

export interface Card6Props {
  className?: string;
  post: PostWithRelations;
}

export default function Component({ className = 'h-full', post }: Card6Props) {
  const { title, slug, featuredImage, categories, postType } = post;

  return (
    <div
      dir="rtl"
      className={`nc-Card6 relative flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-start xl:items-center p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow ${className}`}
    >
      <Link href={getPostLink(postType, slug)} className="absolute inset-0 z-0" />
      <Link
        href={getPostLink(postType, slug)}
        className="block relative flex-shrink-0 w-full h-48 sm:w-56 sm:h-40 lg:w-full lg:h-48 xl:w-56 xl:h-40 mb-4 sm:mb-0 lg:mb-4 xl:mb-0 sm:ml-5 lg:ml-0 xl:ml-5 rounded-2xl overflow-hidden z-10"
      >
        <Image
          sizes="(max-width: 639px) 100vw, (min-width: 640px) and (max-width: 1023px) 224px, (min-width: 1024px) and (max-width: 1279px) 100vw, 224px"
          className="object-cover"
          fill
          src={featuredImage || '/placeholder.jpg'}
          alt={title}
        />
        <span className="absolute bottom-1 right-1">
          <PostTypeFeaturedIcon wrapSize="h-7 w-7" iconSize="h-4 w-4" postType={postType} />
        </span>
      </Link>
      <div className="flex flex-col flex-grow w-full">
        <div className="space-y-3 mb-4">
          <CategoryBadgeList categories={categories} />
          <h2 className="block font-semibold text-base sm:text-md">
            <Link href={getPostLink(postType, slug)} className="line-clamp-2" title={title}>
              {title}
            </Link>
          </h2>
          <PostCardMeta meta={post} />
        </div>
        <div className="flex flex-row items-center justify-between mt-auto w-full">
          <BookmarkCheck post={post}>
            {(isBookmarked) => (
              <PostCardSaveAction
                postId={post.id}
                initialBookmarked={isBookmarked}
                bookmarkClass="h-8 w-8 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              />
            )}
          </BookmarkCheck>
          <PostCardLikeAndComment post={post} />
        </div>
      </div>
    </div>
  );
}
