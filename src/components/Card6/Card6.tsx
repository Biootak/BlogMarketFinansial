'use client';

import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import type { PostWithRelations } from '@/types/types';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { getPostLink } from '@/lib/getPostLink';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export interface Card6Props {
  className?: string;
  post: PostWithRelations;
}

export default function Card6({ className = '', post }: Card6Props) {
  const { title, slug, featuredImage, categories, postType } = post;
  const postLink = getPostLink(postType, slug);

  return (
    <motion.article
      dir="rtl"
      className={`nc-Card6 group relative ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Mobile: Vertical Card with Overlay | Desktop: Horizontal Card */}
      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
        
        {/* Mobile Layout: Full-width image with content overlay */}
        <div className="sm:hidden relative w-full">
          <Link href={postLink} className="block">
            <OptimizedImage
              src={featuredImage || '/images/placeholder-large.png'}
              alt={title}
              aspectRatio="16/10"
              sizes="100vw"
              priority={false}
            />
            
            {/* Strong Gradient for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
            
            {/* Colored Gradient Accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/30 via-transparent to-violet-600/20 mix-blend-overlay" />
          </Link>

          {/* Content Overlay on Mobile */}
          <div className="absolute inset-0 flex flex-col justify-between p-3">
            {/* Top Section: Categories & Post Type */}
            <div className="flex items-start justify-between gap-2">
              <CategoryBadgeList 
                categories={categories} 
                className="flex flex-wrap gap-1.5"
                itemClass="text-[10px] px-2 py-1 font-semibold backdrop-blur-md bg-white/90 dark:bg-neutral-900/90 shadow-lg"
              />
              <PostTypeFeaturedIcon
                wrapSize="h-7 w-7"
                iconSize="h-3.5 w-3.5"
                postType={postType}
              />
            </div>

            {/* Bottom Section: Title & Meta */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-base leading-snug text-white drop-shadow-lg">
                <Link
                  href={postLink}
                  className="line-clamp-2 hover:text-primary-300 transition-colors duration-300"
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
                  className="text-[11px] text-white/90 [&_span]:text-white/70"
                />
              </div>
            </div>
          </div>

          {/* Hover Arrow on Mobile */}
          <div className="absolute top-3 start-3 opacity-0 group-active:opacity-100 transition-opacity duration-200">
            <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center border border-white/30">
              <ArrowLeft className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Desktop Layout: Horizontal Card */}
        <div className="hidden sm:flex flex-row items-stretch p-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm border border-neutral-100 dark:border-neutral-800 gap-4 relative">
          
          {/* Subtle Hover Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/0 to-violet-50/0 group-hover:from-primary-50/50 group-hover:to-violet-50/30 dark:group-hover:from-primary-950/20 dark:group-hover:to-violet-950/10 transition-all duration-200 pointer-events-none" />

          {/* Image Container - Desktop */}
          <Link
            href={postLink}
            className="block relative flex-shrink-0 w-36 md:w-40 lg:w-44 rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300 ring-1 ring-neutral-200/50 dark:ring-neutral-700/50 group-hover:ring-primary-400/50 dark:group-hover:ring-primary-500/50 group-hover:ring-2"
          >
            <OptimizedImage
              src={featuredImage || '/images/placeholder-large.png'}
              alt={title}
              aspectRatio="5/3"
              sizes="(max-width: 768px) 144px, (max-width: 1024px) 160px, 176px"
              priority={false}
              className="transition-transform duration-300 group-hover:scale-105"
            />
            
            {/* Lighter Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
            
            {/* Post Type Icon */}
            <span className="absolute bottom-2.5 start-2.5 z-10">
              <PostTypeFeaturedIcon
                wrapSize="h-7 w-7"
                iconSize="h-3.5 w-3.5"
                postType={postType}
              />
            </span>

            {/* Hover Arrow */}
            <div className="absolute bottom-2.5 end-2.5 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-sm grid place-items-center border border-white/20">
                <ArrowLeft className="w-3.5 h-3.5 text-white drop-shadow" />
              </div>
            </div>
          </Link>

          {/* Content Section - Desktop */}
          <div className="relative flex flex-col flex-grow justify-between min-w-0 py-0.5">
            
            {/* Categories */}
            <div className="mb-2">
              <CategoryBadgeList 
                categories={categories} 
                className="flex flex-wrap gap-1.5"
                itemClass="text-[10px] px-2.5 py-1 font-medium"
              />
            </div>

            {/* Title */}
            <h3 className="font-bold text-sm md:text-[15px] text-neutral-900 dark:text-neutral-100 leading-relaxed mb-auto">
              <Link
                href={postLink}
                className="line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-300"
                title={title}
              >
                {title}
              </Link>
            </h3>

            {/* Meta Section */}
            <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 relative">
              {/* Accent Line */}
              <div className="absolute top-0 start-0 w-10 h-[1.5px] bg-gradient-to-l from-primary-500 to-violet-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              
              <PostCardMeta
                hiddenAvatar={false}
                avatarSize="h-6 w-6 text-[10px] ring-1 ring-white dark:ring-neutral-800"
                meta={post}
                className="text-[11px] text-neutral-500 dark:text-neutral-400"
              />
            </div>
          </div>

          {/* Side Accent Bar - Desktop */}
          <div className="absolute top-3 bottom-3 start-0 w-1 bg-gradient-to-b from-primary-400 via-violet-500 to-rose-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 scale-y-0 group-hover:scale-y-100 origin-center" />
        </div>
      </div>
    </motion.article>
  );
}
