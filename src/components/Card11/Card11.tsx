import type React from 'react';
import Link from 'next/link';
import type { PostWithRelations } from '@/types/types';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import { getPostLink } from '@/lib/getPostLink';

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
  ratio = 'aspect-[4/3]',
}) => {
  const { title, categories, createdAt, slug, postType, excerpt } = post;

  if (!post || !post.slug) {
    return null;
  }

  const postLink = getPostLink(postType, slug);

  return (
    <div
      className={`nc-Card11 relative flex flex-col group rounded-2xl overflow-hidden bg-white dark:bg-neutral-800/90 ${className} transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-neutral-200/80 dark:border-neutral-700/80 hover:border-primary-200 dark:hover:border-primary-800`}
    >
      {/* Image Container */}
      <div className={`block flex-shrink-0 relative w-full overflow-hidden ${ratio}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="transition-transform duration-500 group-hover:scale-105">
          <PostFeaturedMedia post={post} imageRatio="landscape" />
        </div>
      </div>
      
      {/* Category Badge */}
      <span className="absolute top-3 end-3 z-20">
        <CategoryBadgeList categories={categories} />
      </span>

      {/* Content */}
      <div className="p-5 flex flex-col gap-3 flex-1">
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
          <h3 className="nc-card-title block text-base font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200 leading-snug">
            <span className="line-clamp-2" title={title}>
              {title}
            </span>
          </h3>
          {excerpt && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-2.5 leading-relaxed group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors duration-200">
              {excerpt}
            </p>
          )}
        </Link>
        
        {/* Read More Indicator */}
        <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-700/50">
          <Link 
            href={postLink}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            <span>ادامه مطلب</span>
            <svg className="w-3.5 h-3.5 rotate-180 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Card11;
