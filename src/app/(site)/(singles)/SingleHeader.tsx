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
    <div className={`nc-SingleHeader ${className} text-right rtl`}>
      <div className="space-y-5">
        <CategoryBadgeList itemClass="!px-3" categories={post.categories} />
        <SingleTitle mainClass={titleMainClass} title={post.title} />
        {!hiddenDesc && (
          <span className="block text-base text-neutral-500 md:text-lg dark:text-neutral-400 pb-1">
            {post.excerpt}
          </span>
        )}
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <div className="flex flex-col sm:flex-row justify-between sm:items-end space-y-5 sm:space-y-0 sm:space-x-5 rtl:space-x-reverse">
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
          <SingleMetaAction2 post={post} />
        </div>
      </div>
    </div>
  );
};

export default SingleHeader;
