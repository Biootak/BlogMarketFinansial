'use client';

import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import { getPostLink } from '@/lib/getPostLink';
import type { PostWithRelations } from '@/types/types';
import Image from 'next/image';
import Link from 'next/link';
import React, { type FC, useMemo } from 'react';
import GallerySlider from './GallerySlider';
import MediaAudio from './MediaAudio';
import MediaVideo from './MediaVideo';

export interface PostFeaturedMediaProps {
  className?: string;
  post: PostWithRelations;
  isHover?: boolean;
  imageRatio?: 'portrait' | 'landscape' | 'square' | 'video' | 'cinema';
}

const aspectRatioClasses = {
  portrait: 'aspect-[3/4]', // نسبت 3:4 برای تصاویر پرتره
  landscape: 'aspect-[4/3]', // نسبت 4:3 برای تصاویر افقی
  square: 'aspect-square', // نسبت 1:1 برای تصاویر مربعی
  video: 'aspect-[16/9]', // نسبت 16:9 برای ویدیوها
  cinema: 'aspect-[21/9]', // نسبت 21:9 برای نمایش سینمایی
};

const PostFeaturedMedia: FC<PostFeaturedMediaProps> = ({
  className = 'w-full h-full',
  post,
  isHover = false,
  imageRatio = 'landscape',
}) => {
  const { featuredImage, postType, videoUrl, galleryImages, audioUrl, slug } = post;

  const isPostMedia = useMemo(() => postType === 'VIDEO' || postType === 'AUDIO', [postType]);

  const postLink = useMemo(() => getPostLink(postType, slug), [postType, slug]);

  const renderGallerySlider = useMemo(() => {
    if (!galleryImages || galleryImages.length === 0) return null;
    return (
      <GallerySlider
        href={postLink}
        galleryImgs={galleryImages}
        className="absolute inset-0 z-10"
        galleryClass="absolute inset-0"
        ratioClass={aspectRatioClasses[imageRatio]}
      />
    );
  }, [galleryImages, postLink, imageRatio]);

  const renderContent = useMemo(() => {
    // GALLERY
    if (postType === 'GALLERY') {
      return renderGallerySlider;
    }

    // VIDEO
    if (postType === 'VIDEO' && videoUrl && isHover) {
      return <MediaVideo isHover videoUrl={videoUrl} />;
    }

    // AUDIO
    if (postType === 'AUDIO' && audioUrl) {
      return <MediaAudio post={post} />;
    }

    // ICON
    return isPostMedia ? (
      <span className="absolute inset-0 flex items-center justify-center">
        <PostTypeFeaturedIcon
          className="hover:scale-105 transform cursor-pointer transition-transform"
          postType={postType}
        />
      </span>
    ) : null;
  }, [postType, videoUrl, audioUrl, isHover, isPostMedia, post, renderGallerySlider]);

  // Get the appropriate aspect ratio class
  const ratioClass = aspectRatioClasses[postType === 'VIDEO' ? 'video' : imageRatio];

  return (
    <div
      className={`nc-PostFeaturedMedia relative ${ratioClass} ${className} dark:bg-neutral-800 rounded-3xl overflow-hidden`}
      dir="rtl"
    >
      {postType !== 'GALLERY' && featuredImage && (
        <Image
          src={
            featuredImage.startsWith('/') || featuredImage.startsWith('http')
              ? featuredImage
              : `/${featuredImage}`
          }
          alt="Featured"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
          unoptimized={featuredImage.includes('.svg')}
        />
      )}

      {renderContent}
      {postType !== 'GALLERY' && (
        <Link
          href={postLink}
          className={`block absolute inset-0 ${
            postType === 'STANDARD'
              ? 'bg-black/20 transition-opacity opacity-0 group-hover:opacity-100'
              : ''
          }`}
        />
      )}
    </div>
  );
};

export default PostFeaturedMedia;
