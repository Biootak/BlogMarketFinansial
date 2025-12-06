'use client';

import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { getPostLink } from '@/lib/getPostLink';
import type { PostWithRelations } from '@/types/types';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';;;
import Link from 'next/link';
import React from 'react';
import PostCardMeta from '../PostCardMeta/PostCardMeta';

interface Card2Props {
  className?: string;
  post: PostWithRelations;
  size?: 'normal' | 'large';
}

export default function Card2({ className = 'h-full', size = 'normal', post }: Card2Props) {
  const { title, featuredImage, categories, postType, slug, excerpt } = post;
  const postLink = getPostLink(postType, slug);
  const isLarge = size === 'large';

  return (
    <motion.div
      className={`nc-Card2 group relative flex flex-col ${className}`}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-700/50 shadow-sm hover:shadow-xl hover:shadow-primary-500/10 dark:hover:shadow-primary-500/5 transition-all duration-300">
        {/* Image Container - Better aspect ratio for mobile */}
        <Link href={postLink} className="block relative w-full overflow-hidden">
          <OptimizedImage
            src={featuredImage || '/images/placeholder-large.png'}
            alt={title}
            aspectRatio={isLarge ? '16/9' : '4/3'}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={isLarge}
            className="transition-transform duration-300 group-hover:scale-105"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

          {/* Post Type Icon */}
          <PostTypeFeaturedIcon
            className="absolute bottom-2 sm:bottom-3 start-2 sm:start-3 z-10"
            postType={postType}
            wrapSize="w-7 h-7 sm:w-9 sm:h-9"
            iconSize="w-3 h-3 sm:w-4 sm:h-4"
          />

          {/* Categories */}
          <div className="absolute top-2 sm:top-3 end-2 sm:end-3 z-10">
            <CategoryBadgeList
              className="flex flex-wrap gap-1 sm:gap-1.5"
              itemClass="relative text-[10px] sm:text-xs"
              categories={categories}
              disableLinks={true}
            />
          </div>

          {/* Hover Arrow - Hidden on mobile */}
          <div className="hidden sm:flex absolute bottom-3 end-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <ArrowLeft className="w-5 h-5 text-white" />
            </div>
          </div>
        </Link>

        {/* Content */}
        <div className="p-3 sm:p-4 lg:p-5">
          {/* Meta */}
          <PostCardMeta
            className="relative text-xs sm:text-sm mb-2 sm:mb-3"
            avatarSize="h-6 w-6 sm:h-8 sm:w-8 text-xs sm:text-sm"
            meta={post}
          />

          {/* Title */}
          <h2
            className={`font-bold text-neutral-900 dark:text-white leading-snug mb-1.5 sm:mb-2 ${
              isLarge ? 'text-base sm:text-lg lg:text-xl' : 'text-sm sm:text-base lg:text-lg'
            }`}
          >
            <Link
              href={postLink}
              className="line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-300"
              title={title}
            >
              {title}
            </Link>
          </h2>

          {/* Excerpt - Hidden on small mobile */}
          {excerpt && (
            <p className="hidden sm:block text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm leading-relaxed line-clamp-2">
              {excerpt}
            </p>
          )}

          {/* Read More Link */}
          <Link
            href={postLink}
            className="inline-flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-4 text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors group/link"
          >
            <span>ادامه مطلب</span>
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover/link:-translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Bottom Accent Line */}
        <div className="absolute bottom-0 start-0 end-0 h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </motion.div>
  );
}
