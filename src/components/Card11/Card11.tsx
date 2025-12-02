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
      className={`nc-Card11 relative flex flex-col group rounded-2xl overflow-hidden bg-white dark:bg-neutral-800 ${className} transition-all duration-300 hover:shadow-lg hover:shadow-neutral-300/50 dark:hover:shadow-black/30 border border-neutral-200 dark:border-neutral-700`}
    >
      <div className={`block flex-shrink-0 relative w-full rounded-t-2xl overflow-hidden ${ratio}`}>
        <div>
          <PostFeaturedMedia post={post} imageRatio="landscape" />
        </div>
      </div>
      <span className="absolute top-1 right-1">
        <CategoryBadgeList categories={categories} />
      </span>

      <div className="p-5 flex flex-col space-y-4">
        {!hiddenAuthor ? (
          <PostCardMeta meta={post} />
        ) : (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {createdAt.toString()}
          </span>
        )}
        <Link href={postLink} className="group">
          <h3 className="nc-card-title block text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-500">
            <span className="line-clamp-2" title={title}>
              {title}
            </span>
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-2 group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
            {excerpt}
          </p>
        </Link>
      </div>
    </div>
  );
};

export default Card11;
