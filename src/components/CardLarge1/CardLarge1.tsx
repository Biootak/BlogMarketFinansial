'use client';

import Avatar from '@/components/Avatar/Avatar';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import FormattedDate from '@/components/FormattedDate';
import NcImage from '@/components/NcImage/NcImage';
import { getPostLink } from '@/lib/getPostLink';
import { motion } from '@/lib/motion-shim';
import { getReadingMinutes } from '@/lib/readingTime';
import type { PostWithRelations } from '@/types/types';
import Link from 'next/link';
import React, { useMemo } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import CardSkeleton from '../Skeletons/CardSkeleton';

export interface CardLarge1Props {
  className?: string;
  post: PostWithRelations;
  onClickNext?: () => void;
  onClickPrev?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  currentIndex?: number;
  totalSlides?: number;
}

const CardLarge1: React.FC<CardLarge1Props> = React.memo(
  ({
    className = '',
    post,
    onClickNext = () => {},
    onClickPrev = () => {},
    onKeyDown,
    currentIndex = 0,
    totalSlides = 1,
  }) => {
    const categoryElement = useMemo(
      () => (post?.categories ? <CategoryBadgeList categories={post.categories} /> : null),
      [post?.categories],
    );

    if (!post || !post.author) {
      return <CardSkeleton className={className} />;
    }

    const { featuredImage, title, slug, postType, excerpt, author, createdAt } = post;
    const readingTime = getReadingMinutes(post);

    return (
      <motion.div
        className={`nc-CardLarge1 relative ${className}`}
        onKeyDown={onKeyDown}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-center min-h-[260px] lg:min-h-[320px]">
          {/* Content Section */}
          <div className="order-2 lg:order-1 space-y-3 lg:space-y-4 p-4 lg:p-0">
            {/* Category Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {categoryElement}
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-lg sm:text-xl lg:text-2xl font-bold text-neutral-900 dark:text-white leading-snug"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                href={getPostLink(postType, slug)}
                title={title}
                className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-300 line-clamp-3"
              >
                {title}
              </Link>
            </motion.h1>

            {/* Excerpt */}
            {excerpt && (
              <motion.p
                className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {excerpt}
              </motion.p>
            )}

            {/* Author & Meta */}
            <motion.div
              className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link href={`/author/${author.id}`} className="flex items-center gap-3 group">
                <Avatar
                  sizeClass="h-9 w-9"
                  radius="rounded-full"
                  imgUrl={author.profile?.avatar || author.image}
                  userName={author.name || ''}
                />
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {author.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <FormattedDate date={createdAt} />
                    <span>•</span>
                    <span>{readingTime} دقیقه مطالعه</span>
                  </div>
                </div>
              </Link>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onClickPrev}
                  className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-primary-500 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-105"
                  aria-label="قبلی"
                >
                  <HiChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onClickNext}
                  className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-primary-500 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-105"
                  aria-label="بعدی"
                >
                  <HiChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            {/* Slide Counter */}
            {totalSlides > 1 && (
              <motion.div
                className="flex items-center gap-2 text-sm text-neutral-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {String(currentIndex + 1).padStart(2, '0')}
                </span>
                <span>/</span>
                <span>{String(totalSlides).padStart(2, '0')}</span>
              </motion.div>
            )}
          </div>

          {/* Image Section */}
          <motion.div
            className="order-1 lg:order-2 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href={getPostLink(postType, slug)}
              className="block relative aspect-[16/10] lg:aspect-[16/9] rounded-xl lg:rounded-2xl overflow-hidden group"
            >
              {/* Main Image */}
              <NcImage
                containerClassName="absolute inset-0"
                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                src={featuredImage || '/images/placeholder-large.png'}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Play Button for Video Posts */}
              {postType === 'VIDEO' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                    <svg
                      className="w-4 h-4 lg:w-5 lg:h-5 text-primary-600 ms-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              )}
            </Link>

            {/* Decorative Elements */}
            <div className="absolute -bottom-2 -start-2 w-16 h-16 bg-primary-500/10 rounded-full blur-xl -z-10" />
            <div className="absolute -top-2 -end-2 w-20 h-20 bg-secondary-500/10 rounded-full blur-xl -z-10" />
          </motion.div>
        </div>
      </motion.div>
    );
  },
);

CardLarge1.displayName = 'CardLarge1';

export default CardLarge1;
