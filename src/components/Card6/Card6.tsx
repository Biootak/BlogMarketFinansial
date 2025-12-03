import React from 'react';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import type { PostWithRelations } from '@/types/types';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import Link from 'next/link';
import Image from 'next/image';
import { getPostLink } from '@/lib/getPostLink';

export interface Card6Props {
  className?: string;
  post: PostWithRelations;
}

export default function Component({ className = '', post }: Card6Props) {
  const { title, slug, featuredImage, categories, postType } = post;
  const postLink = getPostLink(postType, slug);

  return (
    <div
      dir="rtl"
      className={`nc-Card6 group relative flex flex-row items-stretch p-2 sm:p-3 md:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow hover:shadow-lg transition-shadow duration-300 gap-3 sm:gap-4 ${className}`}
    >
      <Link
        href={postLink}
        className="block relative flex-shrink-0 w-1/3 aspect-[4/3] rounded-xl overflow-hidden z-10"
      >
        <Image
          sizes="(max-width: 639px) 33vw, (max-width: 1023px) 25vw, 20vw"
          className="object-cover"
          fill
          src={featuredImage || '/placeholder.jpg'}
          alt={title}
        />
        <span className="absolute bottom-1 end-1">
          <PostTypeFeaturedIcon
            wrapSize="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6"
            iconSize="h-2 w-2 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5"
            postType={postType}
          />
        </span>
      </Link>
      <div className="flex flex-col flex-grow justify-between">
        <div className="flex flex-col h-full">
          <div className="hidden sm:block">
            <CategoryBadgeList categories={categories} />
          </div>
          <h3 className="block pt-2 font-semibold text-[12px] sm:text-xs md:text-base leading-snug mb-auto">
            <Link
              href={postLink}
              className="line-clamp-2 dark:text-neutral-100 group-hover:text-primary-900 dark:group-hover:text-primary-500 transition-colors duration-300 font-vazirmatn"
              title={title}
            >
              {title}
            </Link>
          </h3>
          <PostCardMeta
            hiddenAvatar={false}
            avatarSize="h-6 w-6 text-xs"
            meta={post}
            className="text-[10px] sm:text-[11px] md:text-xs mt-1 font-medium text-neutral-700 dark:text-neutral-300 font-vazirmatn"
          />
        </div>
      </div>
    </div>
  );
}
