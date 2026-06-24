'use client';
import type React from 'react';
import { useMemo, useState, useCallback } from 'react';
import NcImage from '@/components/NcImage/NcImage';
import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import CardAuthor2 from '@/components/CardAuthor2/CardAuthor2';
import Link from 'next/link';
import type { PostWithRelations } from '@/types/types';
import BookmarkCheck from '../BookmarkCheck';
import { getPostLink } from '@/lib/getPostLink';

interface Card10V3Props {
  className?: string;
  post: PostWithRelations;
  galleryType?: 1 | 2;
}

const Card10V3: React.FC<Card10V3Props> = ({ className = 'h-full', post, galleryType = 1 }) => {
  const { title, categories, postType, galleryImages, slug, id } = post;
  const [isHover, setIsHover] = useState(false);

  const renderGalleryImage = useCallback(
    (src: string, customClassName = '') => (
      <NcImage
        alt="Gallery image"
        containerClassName={`relative w-full h-full ${customClassName}`}
        className="absolute inset-0 object-cover w-full h-full"
        src={src}
        sizes="(max-width: 600px) 480px, 800px"
      />
    ),
    [],
  );

  const renderGallery = useMemo(() => {
    if (!galleryImages || galleryImages.length === 0) return null;

    const images = [...galleryImages, ...galleryImages, ...galleryImages, ...galleryImages].slice(
      0,
      4,
    );

    return galleryType === 1 ? (
      <div className="w-full h-full grid grid-cols-3 gap-1 sm:gap-2">
        <div className="h-full">{renderGalleryImage(images[0])}</div>
        <div className="flex flex-col gap-1 sm:gap-2 h-full">
          <div className="flex-grow">{renderGalleryImage(images[1])}</div>
          <div className="flex-grow">{renderGalleryImage(images[2])}</div>
        </div>
        <div className="h-full">{renderGalleryImage(images[3])}</div>
      </div>
    ) : (
      <div className="w-full h-full flex flex-col gap-1 sm:gap-2">
        <div className="flex gap-1 sm:gap-2 h-1/2">
          <div className="w-2/3 h-full">{renderGalleryImage(images[0])}</div>
          <div className="w-1/3 h-full">{renderGalleryImage(images[1])}</div>
        </div>
        <div className="flex gap-1 sm:gap-2 h-1/2">
          <div className="w-1/3 h-full">{renderGalleryImage(images[2])}</div>
          <div className="w-2/3 h-full">{renderGalleryImage(images[3])}</div>
        </div>
      </div>
    );
  }, [galleryImages, galleryType, renderGalleryImage]);

  return (
    <div
      className={`nc-Card10V3 group relative flex flex-col transition-shadow duration-300 hover:shadow-lg ${className}`}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div className="block group rounded-xl sm:rounded-2xl flex-shrink-0 relative w-full aspect-[16/10] sm:aspect-[3/2] overflow-hidden z-0">
        {postType !== 'GALLERY' || !galleryImages || galleryImages.length === 0 ? (
          <PostFeaturedMedia post={post} isHover={isHover} />
        ) : (
          renderGallery
        )}

      </div>
      <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 flex justify-between items-start gap-2 sm:gap-4">
        <CategoryBadgeList categories={categories} className="flex flex-wrap gap-1" />
        <BookmarkCheck post={post}>
          {(isBookmarked) => (
            <PostCardSaveAction
              className="relative"
              postId={id}
              initialBookmarked={isBookmarked}
              bookmarkClass="h-6 w-6 sm:h-8 sm:w-8 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            />
          )}
        </BookmarkCheck>
      </div>
      <div className="space-y-1.5 sm:space-y-2.5 mt-2 sm:mt-4 px-2 sm:px-4">
        <h2 className="nc-card-title block text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100">
          <Link href={getPostLink(postType, slug)} className="line-clamp-2" title={title}>
            {title}
          </Link>
        </h2>
        <CardAuthor2 className="mt-2 sm:mt-3" post={post} hoverReadingTime={false} />
      </div>
    </div>
  );
};

export default Card10V3;
