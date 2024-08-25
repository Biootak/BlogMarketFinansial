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

interface Card10V3Props {
  className?: string;
  post: PostWithRelations;
  galleryType?: 1 | 2;
}

const Card10V3: React.FC<Card10V3Props> = ({ className = 'h-full', post, galleryType = 1 }) => {
  const { title, categories, postType, galleryImages, slug, id } = post;
  const [isHover, setIsHover] = useState(false);

  const renderGalleryImage = useCallback((src: string, customClassName = '') => (
    <NcImage
      alt=""
      fill
      containerClassName={`relative ${customClassName}`}
      className="absolute inset-0 object-cover w-full h-full"
      src={src}
    />
  ), []);

  const renderGallery = useMemo(() => {
    if (!galleryImages || galleryImages.length === 0) return null;

    const images = [...galleryImages, ...galleryImages, ...galleryImages, ...galleryImages].slice(0, 4);

    return galleryType === 1 ? (
      <div className="w-full h-full grid grid-cols-3 gap-2">
        <div className="grid">{renderGalleryImage(images[0])}</div>
        <div className="grid grid-rows-2 gap-2">
          {renderGalleryImage(images[1])}
          {renderGalleryImage(images[2])}
        </div>
        <div className="grid">{renderGalleryImage(images[3])}</div>
      </div>
    ) : (
      <div className="w-full h-full grid grid-rows-2 gap-2">
        <div className="grid grid-cols-3 gap-2">
          {renderGalleryImage(images[0], 'col-span-2')}
          {renderGalleryImage(images[1])}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {renderGalleryImage(images[2])}
          {renderGalleryImage(images[3], 'col-span-2')}
        </div>
      </div>
    );
  }, [galleryImages, galleryType, renderGalleryImage]);

  return (
    <div
      className={`nc-Card10V3 group relative flex flex-col ${className}`}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div className="block group rounded-3xl flex-shrink-0 relative w-full aspect-w-16 aspect-h-16 sm:aspect-h-9 overflow-hidden z-0">
        {postType !== 'GALLERY' || !galleryImages || galleryImages.length === 0 ? (
          <PostFeaturedMedia post={post} isHover={isHover} />
        ) : (
          renderGallery
        )}
        <Link
          href={`single/${slug}`}
          className="absolute inset-0 bg-neutral-900 bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
      <div className="absolute top-3 inset-x-3 flex justify-between items-start space-x-4 rtl:space-x-reverse">
        <CategoryBadgeList categories={categories} />
        <BookmarkCheck post={post}>
          {(isBookmarked) => (
            <PostCardSaveAction
              className="relative"
              postId={id}
              initialBookmarked={isBookmarked}
              bookmarkClass="h-8 w-8 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            />
          )}
        </BookmarkCheck>
      </div>
      <div className="space-y-2.5 mt-4 px-4">
        <h2 className="nc-card-title block sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          <Link href={`single/${slug}`} className="line-clamp-1" title={title}>
            {title}
          </Link>
        </h2>
        <CardAuthor2 className="mt-3" post={post} hoverReadingTime={false} />
      </div>
    </div>
  );
};

export default Card10V3;