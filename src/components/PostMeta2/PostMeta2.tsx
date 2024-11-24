import React, { type FC } from 'react';
import Link from 'next/link';
import type { PostWithRelations } from '@/types/types';
import { toPersianNumber } from '@/lib/utils';
import { Icon } from '../ui/icon';
import { formatDate } from '@/utils/formatDate';

export interface PostMeta2Props {
  className?: string;
  meta: {
    date: Date | string | number;
    categories: PostWithRelations['categories'];
    readingTime: number;
  };
  hiddenCategories?: boolean;
  size?: 'large' | 'normal';
}

const PostMeta2: FC<PostMeta2Props> = ({
  className = 'leading-none',
  meta,
  hiddenCategories = false,
  size = 'normal',
}) => {
  const { date, categories, readingTime } = meta;

  return (
    <div
      className={`nc-PostMeta2 flex flex-col sm:flex-row items-start sm:items-center flex-wrap text-neutral-700 text-right dark:text-neutral-200 ${
        size === 'normal' ? 'text-xs sm:text-sm' : 'text-xs'
      } ${className} rtl`}
    >
      <div className="flex items-center space-s-4 mb-2 sm:mb-0">
        <div className="flex items-center group space-x-1">
          <Icon
            name="Calendar"
            className="ml-1 size-4 sm:size-5 text-primary-400 transition-transform duration-300 ease-in-out group-hover:scale-110"
          />
          <span className="text-neutral-700 dark:text-neutral-300 group-hover:text-primary-500 transition-colors duration-300">
            {formatDate(date)}
          </span>
        </div>
        <div className="hidden sm:flex items-center group">
          <Icon
            name="Clock"
            className="ml-1 size-4 sm:size-5 text-green-400 transition-transform duration-300 ease-in-out group-hover:scale-110"
          />
          <span className="group-hover:text-green-500 transition-colors duration-300">
            {toPersianNumber(readingTime)} دقیقه مطالعه
          </span>
        </div>
      </div>

      {!hiddenCategories && categories.length > 0 && (
        <div className="flex items-center group mt-2 sm:mt-0 sm:mr-4">
          <Icon
            name="Tag"
            className="mr-2 size-4 sm:size-5 text-purple-500 transition-transform duration-300 ease-in-out group-hover:scale-110"
          />
          {categories.map((cat, index) => (
            <React.Fragment key={cat.id}>
              <Link
                href={`/category/${cat.id}`}
                className="font-semibold hover:text-purple-500 transition-colors duration-300"
              >
                {cat.name}
              </Link>
              {index < categories.length - 1 && <span className="mx-1">،</span>}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostMeta2;
