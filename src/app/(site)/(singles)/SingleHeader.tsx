import type React from 'react';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import SingleTitle from './SingleTitle';
import PostMeta2 from '@/components/PostMeta2/PostMeta2';
import SingleMetaAction2 from './SingleMetaAction2';
import type { PostWithRelations } from '@/types/types';

interface SingleHeaderProps {
  post: PostWithRelations;
  hiddenDesc?: boolean;
  titleMainClass?: string;
  className?: string;
}

const SingleHeader: React.FC<SingleHeaderProps> = ({
  post,
  titleMainClass,
  hiddenDesc = false,
  className = '',
}) => {
  return (
    <div
      className={`nc-SingleHeader ${className} text-right rtl p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md`}
    >
      <div className="space-y-4 sm:space-y-5 lg:space-y-6">
        <CategoryBadgeList itemClass="!px-3" categories={post.categories} />
        <SingleTitle
          mainClass={`${titleMainClass} text-xl sm:text-2xl lg:text-3xl font-bold`}
          title={post.title}
        />
        {!hiddenDesc && (
          <span className="block text-sm sm:text-base lg:text-lg text-neutral-600 dark:text-neutral-300 pb-1">
            {post.excerpt}
          </span>
        )}
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <div className="flex flex-row items-center justify-between gap-4">
          <PostMeta2
            size="large"
            className="leading-none flex-shrink-0"
            hiddenCategories
            avatarRounded="rounded-full shadow-inner"
            meta={{
              author: post.author,
              date: post.createdAt.toDateString(),
              categories: post.categories,
            }}
          />
          <SingleMetaAction2 post={post} className="flex-shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default SingleHeader;
