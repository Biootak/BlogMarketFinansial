'use client';

import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import { SafeImage } from '@/components/SafeImage';
import { heading, radius, text } from '@/lib/design-tokens';
import { getPostLink } from '@/lib/getPostLink';
import type { PostWithRelations } from '@/types/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export interface Card6Props {
  className?: string;
  post: PostWithRelations;
}

export default function Card6({ className = '', post }: Card6Props) {
  const { title, slug, featuredImage, categories, postType } = post;
  const postLink = getPostLink(postType, slug);

  return (
    <article
      dir="rtl"
      className={`nc-Card6 group relative anim-fade-in-up hover:-translate-y-0.5 transition-transform duration-300 ${className}`}
    >
      <div
        className={[
          'relative overflow-hidden shadow-md hover:shadow-xl transition-all duration-300',
          radius.md,
        ].join(' ')}
      >
        {/* Mobile Layout: Full-width image with content overlay */}
        <div className="sm:hidden relative aspect-[16/10] w-full">
          <Link href={postLink} className="block absolute inset-0">
            <SafeImage
              sizes="100vw"
              className="object-cover"
              fill
              src={featuredImage}
              alt={title}
              ratio="16/10"
              priority={false}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/30 via-transparent to-violet-600/20 mix-blend-overlay" />
          </Link>

          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div className="flex items-start justify-between gap-2">
              <CategoryBadgeList
                categories={categories}
                maxVisible={1}
                className="flex flex-wrap gap-1.5"
                itemClass="text-[10px] px-2 py-1 font-semibold backdrop-blur-md bg-white/90 dark:bg-neutral-900/90 shadow-lg"
              />
              <PostTypeFeaturedIcon wrapSize="h-7 w-7" iconSize="h-3.5 w-3.5" postType={postType} />
            </div>

            <div className="space-y-2.5">
              <h3 className={['font-bold text-white drop-shadow-lg', heading.h4].join(' ')}>
                <Link
                  href={postLink}
                  className="line-clamp-2 hover:text-primary-300 transition-colors duration-300 break-words"
                  title={title}
                >
                  {title}
                </Link>
              </h3>

              <div className="flex items-center gap-2 pt-2 border-t border-white/20">
                <PostCardMeta
                  hiddenAvatar={false}
                  avatarSize="h-6 w-6 text-[10px] ring-2 ring-white/50"
                  meta={post}
                  className={['text-white/90 [&_span]:text-white/70', text.meta].join(' ')}
                />
              </div>
            </div>
          </div>

          <div className="absolute top-3 start-3 opacity-0 group-active:opacity-100 transition-opacity duration-200">
            <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center border border-white/30">
              <ArrowLeft className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Desktop Layout: Horizontal Card */}
        <div className="hidden sm:flex flex-row items-stretch p-3 md:p-3.5 lg:p-3.5 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm border border-neutral-100 dark:border-neutral-800 gap-3 md:gap-3.5 lg:gap-4 relative min-h-[7.5rem] md:min-h-[8rem] lg:min-h-[8.5rem]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/0 to-violet-50/0 group-hover:from-primary-50/50 group-hover:to-violet-50/30 dark:group-hover:from-primary-950/20 dark:group-hover:to-violet-950/10 transition-all duration-400 pointer-events-none" />

          <Link
            href={postLink}
            className="block relative flex-shrink-0 w-24 md:w-32 lg:w-36 xl:w-40 2xl:w-44 aspect-[5/3] rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300 ring-1 ring-neutral-200/50 dark:ring-neutral-700/50 group-hover:ring-primary-400/50 dark:group-hover:ring-primary-500/50 group-hover:ring-2"
          >
            <SafeImage
              sizes="(max-width: 768px) 128px, (max-width: 1024px) 144px, (max-width: 1280px) 160px, 176px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              fill
              src={featuredImage}
              alt={title}
              ratio="5/3"
              priority={false}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-300" />

            <span className="absolute bottom-2 start-2 z-10">
              <PostTypeFeaturedIcon wrapSize="h-6 w-6" iconSize="h-3 w-3" postType={postType} />
            </span>

            <div className="absolute bottom-2 end-2 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm grid place-items-center border border-white/20">
                <ArrowLeft className="w-3 h-3 text-white drop-shadow" />
              </div>
            </div>
          </Link>

          <div className="relative flex flex-col flex-grow justify-between min-w-0 py-0.5">
            <div className="mb-1.5">
              <CategoryBadgeList
                categories={categories}
                maxVisible={1}
                className="flex flex-wrap gap-1.5"
                itemClass="text-[10px] px-2 py-0.5 font-medium"
              />
            </div>

            <h3 className={[heading.h4, 'mb-auto line-clamp-2 break-words text-balance'].join(' ')}>
              <Link
                href={postLink}
                className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-300"
                title={title}
              >
                {title}
              </Link>
            </h3>

            <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 relative">
              <div className="absolute top-0 start-0 w-10 h-[1.5px] bg-gradient-to-l from-primary-500 to-violet-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

              <PostCardMeta
                hiddenAvatar={true}
                avatarSize="h-6 w-6 text-[10px] ring-1 ring-white dark:ring-neutral-800"
                meta={post}
                className={text.meta}
              />
            </div>
          </div>

          <div className="absolute top-3 bottom-3 start-0 w-1 bg-gradient-to-b from-primary-400 via-violet-500 to-rose-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 scale-y-0 group-hover:scale-y-100 origin-center" />
        </div>
      </div>
    </article>
  );
}
