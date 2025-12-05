import type React from 'react';
import Link from 'next/link';
import type { PostWithRelations } from '@/types/types';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import { getPostLink } from '@/lib/getPostLink';
import { HiArrowLeft } from 'react-icons/hi2';

export interface Card11Props {
  className?: string;
  post: PostWithRelations;
  ratio?: string;
  hiddenAuthor?: boolean;
}

const Card11: React.FC<Card11Props> = ({
  className = 'h-full',
  post,
  hiddenAuthor = false,
  ratio = '4/3',
}) => {
  const { title, categories, createdAt, slug, postType, excerpt } = post;

  if (!post || !post.slug) {
    return null;
  }

  const postLink = getPostLink(postType, slug);

  return (
    <div
      className={`nc-Card11 relative flex flex-col group rounded-2xl lg:rounded-3xl overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm ${className} transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-neutral-200/60 dark:border-neutral-800/60 hover:border-primary-300/50 dark:hover:border-primary-700/50 hover:-translate-y-1`}
    >
      {/* Decorative Gradient Background on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/0 to-violet-50/0 group-hover:from-primary-50/30 group-hover:to-violet-50/20 dark:group-hover:from-primary-950/20 dark:group-hover:to-violet-950/10 transition-all duration-300 pointer-events-none z-0" />
      
      {/* Image Container */}
      <div className="block flex-shrink-0 relative w-full overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Image with Scale Effect */}
        <div className="transition-transform duration-300 ease-out group-hover:scale-110">
          <PostFeaturedMedia post={post} imageRatio="landscape" />
        </div>
        
        {/* Hover Arrow Indicator */}
        <div className="absolute bottom-3 start-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <div className="w-9 h-9 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/50 dark:border-neutral-700/50">
            <HiArrowLeft className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </div>
      
      {/* Category Badge */}
      <span className="absolute top-3 end-3 z-20">
        <CategoryBadgeList categories={categories} />
      </span>

      {/* Content */}
      <div className="relative p-5 lg:p-6 flex flex-col gap-3 flex-1 z-10">
        {!hiddenAuthor ? (
          <PostCardMeta meta={post} />
        ) : (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {createdAt.toString()}
          </span>
        )}
        
        <Link 
          href={postLink} 
          className="flex-1 flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
        >
          <h3 className="nc-card-title block text-base lg:text-lg font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200 leading-snug">
            <span className="line-clamp-2" title={title}>
              {title}
            </span>
          </h3>
          {excerpt && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-3 leading-relaxed group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors duration-200">
              {excerpt}
            </p>
          )}
        </Link>
        
        {/* Read More Indicator */}
        <div className="mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800/50 relative">
          {/* Accent Line on Hover */}
          <div className="absolute top-0 right-0 w-12 h-px bg-gradient-to-l from-primary-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <Link 
            href={postLink}
            className="inline-flex items-center gap-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-all duration-200 group-hover:gap-3"
          >
            <span>ادامه مطلب</span>
            <HiArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Card11;
