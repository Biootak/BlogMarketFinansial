import React, { type FC } from 'react';
import Avatar from '@/components/Avatar/Avatar';
import Link from 'next/link';
import type { PostWithRelations } from '@/types/types';
import { toPersianNumber } from '@/lib/utils';

export interface PostMeta2Props {
  className?: string;
  meta: {
    author: PostWithRelations['author'];
    date: string;
    categories: PostWithRelations['categories'];
  };
  hiddenCategories?: boolean;
  size?: 'large' | 'normal';
  avatarRounded?: string;
}

const PostMeta2: FC<PostMeta2Props> = ({
  className = 'leading-none',
  meta,
  hiddenCategories = false,
  size = 'normal',
  avatarRounded,
}) => {
  const { date, author, categories } = meta;
  return (
    <div
      className={`nc-PostMeta2 flex items-center flex-wrap text-neutral-700 text-right dark:text-neutral-200 ${
        size === 'normal' ? 'text-xs' : 'text-sm'
      } ${className} rtl`}
    >
      <Link href={`/author/${author.id}`} className="flex items-center space-s-2">
        <Avatar
          radius={avatarRounded}
          sizeClass={size === 'normal' ? 'h-6 w-6 text-sm' : 'h-10 w-10 sm:h-11 sm:w-11 text-xl'}
          imgUrl={author.profile?.avatar || author.image}
          userName={author.name || ''}
        />
      </Link>
      <div className="ms-3">
        <div className="flex items-center">
          <Link href={`/author/${author.id}`} className="block font-semibold">
            {author.name}
          </Link>

          {!hiddenCategories && categories.length > 0 && (
            <>
              <span className="mx-2 font-semibold">·</span>
              <div className="me-0">
                <span className="text-xs">🏷 </span>
                {categories.map((cat, index) => (
                  <React.Fragment key={cat.id}>
                    <Link href={`/category/${cat.id}`} className="font-semibold">
                      {cat.name}
                    </Link>
                    {index < categories.length - 1 && <span>، </span>}
                  </React.Fragment>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="text-xs mt-[6px]">
          <span className="text-neutral-700 dark:text-neutral-300">
            {toPersianNumber(new Date(date).toLocaleDateString('fa-IR'))}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PostMeta2;
