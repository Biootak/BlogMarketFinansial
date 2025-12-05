'use client';

import type { FC } from 'react';
import type { PostWithRelations } from '@/types/types';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import Link from 'next/link';
import Image from 'next/image';
import { getPostLink } from '@/lib/getPostLink';
import { HiArrowLeft } from 'react-icons/hi2';

export interface Card9Props {
  className?: string;
  ratio?: 'portrait' | 'tall' | 'square';
  post: PostWithRelations;
  hoverClass?: string;
}

// نسبت‌های بهینه شده برای حالت عمودی
const aspectRatioClasses = {
  portrait: 'aspect-[3/4]',
  tall: 'aspect-[4/4.5]',
  square: 'aspect-square',
};

const Card9: FC<Card9Props> = ({ className = 'h-full', ratio = 'tall', post, hoverClass = '' }) => {
  const { title, slug, featuredImage, categories, author, createdAt, postType } = post;

  const renderMeta = () => (
    <div className="inline-flex items-center text-xs text-neutral-300">
      <div className="block">
        <h3 className="block text-sm lg:text-base font-bold text-white group-hover:text-primary-300 transition-colors duration-300">
          <Link href={getPostLink(postType, slug)} className="line-clamp-2" title={title}>
            {title}
          </Link>
        </h3>
        <div className="flex mt-3 relative items-center">
          <Link
            href={`/author/${author.id}`}
            className="text-neutral-200 hover:text-white font-medium truncate transition-colors duration-200"
          >
            {author.name}
          </Link>
          <span className="mx-2 w-1 h-1 rounded-full bg-neutral-400" />
          <span className="font-normal truncate text-neutral-300">
            {new Date(createdAt).toLocaleDateString('fa-IR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );

  const imageRatioClass = aspectRatioClasses[ratio];

  return (
    <div
      className={`nc-Card9 relative flex flex-col group rounded-2xl lg:rounded-3xl overflow-hidden z-0 transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:-translate-y-1 ${hoverClass} ${className} rtl`}
    >
      <div className={`flex items-start relative w-full ${imageRatioClass}`}>
        {postType === 'AUDIO' ? (
          <div className="absolute inset-0">
            <PostFeaturedMedia post={post} className="w-full h-full" />
          </div>
        ) : (
          <Link href={getPostLink(postType, slug)} className="relative w-full h-full block overflow-hidden">
            <Image
              fill
              alt={title}
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-110"
              src={featuredImage || '/images/placeholder.webp'}
              sizes="(max-width: 600px) 480px, 500px"
              loading="lazy"
            />
            <PostTypeFeaturedIcon
              className="absolute top-3 start-3 group-hover:opacity-0 transition-opacity duration-300"
              postType={postType}
              wrapSize="w-8 h-8"
              iconSize="w-4 h-4"
            />
            
            {/* Hover Arrow */}
            <div className="absolute top-3 end-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <HiArrowLeft className="w-4 h-4 text-white" />
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Enhanced Gradient Overlay */}
      <div className="absolute bottom-0 inset-x-0 h-3/4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
      
      {/* Colored Accent Gradient */}
      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-primary-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Content Overlay */}
      <div className="absolute bottom-0 inset-x-0 p-5 lg:p-6 flex flex-col flex-grow">
        <div className="mb-4">
          <CategoryBadgeList categories={categories} />
        </div>
        {renderMeta()}
        
        {/* Read More Link */}
        <div className="mt-4 pt-3 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <Link 
            href={getPostLink(postType, slug)}
            className="inline-flex items-center gap-2 text-xs font-bold text-primary-300 hover:text-primary-200 transition-colors"
          >
            <span>ادامه مطلب</span>
            <HiArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
      
      {/* Bottom Accent Line */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-l from-primary-500 via-violet-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};

export default Card9;
