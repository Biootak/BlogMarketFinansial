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

export interface Card6Props {
  className?: string;
  post: PostWithRelations;
}

const Card6 = ({ className = 'h-full', post }: Card6Props) => {
  const { title, slug, featuredImage, categories, postType } = post;

  return (
    <div
      className={`nc-Card6 relative flex group flex-row-reverse items-center sm:p-4 sm:rounded-3xl sm:bg-white sm:dark:bg-neutral-900 sm:border border-neutral-200 dark:border-neutral-700 ${className}`}
    >
      <Link href={`/single/${slug}`} className="absolute inset-0 z-0" />
      <div className="flex flex-col flex-grow">
        <div className="space-y-3 mb-4">
          <CategoryBadgeList categories={categories} />
          <h2 className={'block font-semibold text-sm sm:text-base'}>
            <Link href={`/single/${slug}`} className="line-clamp-2" title={title}>
              {title}
            </Link>
          </h2>
          <PostCardMeta meta={post} />
        </div>
        <div className="flex items-center flex-wrap justify-between mt-auto">
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
          <PostCardLikeAndComment className="relative" post={post} />
        </div>
      </div>

      <Link
        href={`/single/${slug}`}
        className={
          'block relative flex-shrink-0 w-24 h-24 sm:w-40 sm:h-40 me-3 sm:me-5 rounded-2xl overflow-hidden z-0'
        }
      >
        <div className="w-full h-full relative" style={{ aspectRatio: '1 / 1.5' }}>
          <Image
            sizes="(max-width: 600px) 180px, 400px"
            className="object-cover"
            fill
            src={featuredImage || '/placeholder.jpg'}
            alt={title}
          />
        </div>
        <span className="absolute bottom-1 end-1">
          <PostTypeFeaturedIcon wrapSize="h-7 w-7" iconSize="h-4 w-4" postType={postType} />
        </span>
      </Link>
    </div>
  );
};

export default Card6;
