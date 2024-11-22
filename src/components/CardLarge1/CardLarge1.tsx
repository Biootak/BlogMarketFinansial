import React, { useMemo } from 'react';
import Link from 'next/link';
import type { PostWithRelations } from '@/types/types';
import PostCardLikeAndComment from '@/components/PostCardLikeAndComment/PostCardLikeAndComment';
import NcImage from '@/components/NcImage/NcImage';
import NextPrev from '@/components/NextPrev/NextPrev';
import CardAuthor2 from '@/components/CardAuthor2/CardAuthor2';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import CardSkeleton from '../Skeletons/CardSkeleton';
import { getPostLink } from '@/lib/getPostLink';

export interface CardLarge1Props {
  className?: string;
  post: PostWithRelations;
  onClickNext?: () => void;
  onClickPrev?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

const CardLarge1: React.FC<CardLarge1Props> = React.memo(
  ({ className = '', post, onClickNext = () => {}, onClickPrev = () => {}, onKeyDown }) => {
    const categoryElement = useMemo(
      () => (post?.categories ? <CategoryBadgeList categories={post.categories} /> : null),
      [post?.categories],
    );
    const authorElement = useMemo(
      () => (post ? <CardAuthor2 className="relative" post={post} /> : null),
      [post],
    );

    if (!post || !post.author) {
      return <CardSkeleton className={className} />;
    }

    const { featuredImage, title, slug, postType, excerpt } = post;

    return (
      <div
        className={`nc-CardLarge1 relative flex flex-col md:flex-row-reverse ${className} py-2 md:py-3 lg:py-4`}
        onKeyDown={onKeyDown}
      >
        <div className="relative w-full md:w-3/4 lg:w-2/3 overflow-hidden">
          <Link href={getPostLink(postType, slug)} className="nc-CardLarge1__right block relative">
            <div className="relative w-full">
              <NcImage
                containerClassName="absolute inset-0"
                className="object-cover rounded-3xl"
                src={featuredImage || '/placeholder.jpg'}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 66vw"
                priority
              />
              {postType && (
                <PostTypeFeaturedIcon
                  className="absolute top-3 end-3 w-6 h-6 md:w-8 md:h-8"
                  postType={postType}
                />
              )}
            </div>
          </Link>
        </div>

        <div className="md:absolute z-10 md:start-0 md:top-1/2 md:-translate-y-1/2 w-full md:w-1/2 lg:w-2/5 px-3 md:px-0 -mt-10 md:mt-0">
          <div className="nc-CardLarge1__left py-5 px-4 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-lg shadow-lg dark:shadow-2xl rounded-3xl space-y-3 md:-me-8">
            {categoryElement}
            <h2 className="nc-card-title text-lg sm:text-xl lg:text-2xl font-semibold leading-tight">
              <Link href={getPostLink(postType, slug)} title={title}>
                {title}
              </Link>
            </h2>
            {excerpt && (
              <div className="hidden sm:block text-sm text-neutral-500 dark:text-neutral-400">
                {excerpt.slice(0, 100)}...
              </div>
            )}
            {authorElement}
          </div>
          <div className="p-3 md:absolute md:bottom-0 md:end-0 md:translate-x-1/2">
            <NextPrev
              btnClassName="w-8 h-8 text-lg"
              onClickNext={onClickPrev}
              onClickPrev={onClickNext}
            />
          </div>
        </div>
      </div>
    );
  },
);

CardLarge1.displayName = 'CardLarge1';

export default CardLarge1;
