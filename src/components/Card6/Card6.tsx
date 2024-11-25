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
      className={`nc-Card6 group relative flex flex-row items-stretch p-2 sm:p-3 md:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow ${className}`}
    >
      <Link
        href={postLink}
        className="block relative flex-shrink-0 w-1/3 aspect-[4/3] rounded-xl overflow-hidden z-10 ml-2 sm:ml-3 md:ml-4"
      >
        <Image
          sizes="(max-width: 639px) 33vw, (max-width: 1023px) 25vw, 20vw"
          className="object-fill"
          fill
          src={featuredImage || '/placeholder.jpg'}
          alt={title}
        />
        <span className="absolute bottom-1 right-1">
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
          <h2 className="block font-semibold text-base sm:text-sm md:text-sm leading-snug mb-auto">
            <Link
              href={postLink}
              className="line-clamp-2 text-neutral-900 dark:text-neutral-100 group-hover:text-primary-900 dark:group-hover:text-primary-500 transition-colors duration-300"
              title={title}
            >
              {title}
            </Link>
          </h2>
          <PostCardMeta
            hiddenAvatar={true}
            meta={post}
            className="text-[10px] sm:text-xs md:text-sm mt-1"
          />
        </div>
      </div>
    </div>
  );
}
