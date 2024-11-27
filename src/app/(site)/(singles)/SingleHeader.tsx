import type React from 'react';
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

const siteName = 'بازار های مالی';
const SingleHeader: React.FC<SingleHeaderProps> = ({ post, titleMainClass, className = '' }) => {
  const categories = post.categories.map((cat) => cat.name).join(' / ');
  const breadcrumb = `${siteName} / ${categories} / ${post.title}`;

  // Calculate reading time (assuming 200 words per minute)
  const wordCount = post.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div
      className={`nc-SingleHeader ${className} text-right rtl p-4 sm:p-5 lg:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md`}
    >
      <div className="space-y-4 sm:space-y-5 lg:space-y-6">
        <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400">{breadcrumb}</p>

        <SingleTitle
          mainClass={`${titleMainClass} text-xl sm:text-2xl lg:text-xl font-semibold`}
          title={post.title}
        />

        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-4">
          <PostMeta2
            size="large"
            className="leading-none flex-shrink-0"
            hiddenCategories
            meta={{
              date: post.createdAt,
              categories: post.categories,
              readingTime: readingTime,
            }}
          />
          <SingleMetaAction2 post={post} className="flex-shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default SingleHeader;
