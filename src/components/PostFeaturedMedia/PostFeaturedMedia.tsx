'use client';

import React, { type FC, useMemo } from 'react';
import type { PostWithRelations } from '@/types/types';
import GallerySlider from './GallerySlider';
import MediaVideo from './MediaVideo';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import MediaAudio from './MediaAudio';
import Link from 'next/link';
import Image from 'next/image';
import { getPostLink } from '@/lib/getPostLink';

export interface PostFeaturedMediaProps {
  className?: string;
  post: PostWithRelations;
  isHover?: boolean;
}

const PostFeaturedMedia: FC<PostFeaturedMediaProps> = ({
  className = 'w-full h-full',
  post,
  isHover = false,
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
        ratioClass="absolute inset-0"
      />
    );
  }, [galleryImages, postLink]);

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
      <span className="absolute inset-0 flex items-center justify-center ">
        <PostTypeFeaturedIcon
          className="hover:scale-105 transform cursor-pointer transition-transform"
          postType={postType}
        />
      </span>
    ) : null;
  }, [postType, videoUrl, audioUrl, isHover, isPostMedia, post, renderGallerySlider]);

  return (
    <div
      className={`nc-PostFeaturedMedia relative ${className} dark:bg-neutral-800 rounded-3xl`}
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
