import React, { type FC } from 'react';
import Avatar from '@/components/Avatar/Avatar';
import Link from 'next/link';
import type { PostWithRelations } from '@/types/types';
import { formatDate } from '@/utils/formatDate';

export interface CardAuthor2Props {
  className?: string;
  post: PostWithRelations;
  hoverReadingTime?: boolean;
}

const CardAuthor2: FC<CardAuthor2Props> = ({ className = '', post, hoverReadingTime = true }) => {
  if (!post) {
    return null;
  }
  const { author, createdAt } = post;

  const { name: displayName, id: authorId, image: avatar } = author;
  const href = `/author/${authorId}`;

  const readingTime = Math.ceil(post.content.split(' ').length / 200);

  return (
    <Link href={href} className={`nc-CardAuthor2 relative inline-flex items-center ${className}`}>
      <Avatar
        sizeClass="h-10 w-10 text-base"
        containerClassName="flex-shrink-0 me-3"
        radius="rounded-full"
        imgUrl={author.profile?.avatar || avatar}
        userName={displayName || ''}
      />
      <div>
        <h2
          className={
            'text-sm text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white font-medium'
          }
        >
          {displayName}
        </h2>
        <span className={'flex items-center mt-1 text-xs text-neutral-500 dark:text-neutral-400'}>
          <span>{formatDate(createdAt)}</span>
          {readingTime && (
            <>
              <span
                className={`hidden lg:inline mx-1 transition-opacity ${
                  hoverReadingTime ? 'opacity-0 group-hover:opacity-100' : ''
                }`}
              >
                ·
              </span>
              <span
                className={`hidden lg:inline transition-opacity ${
                  hoverReadingTime ? 'opacity-0 group-hover:opacity-100' : ''
                }`}
              >
                {readingTime} min read
              </span>
            </>
          )}
        </span>
      </div>
    </Link>
  );
};

export default CardAuthor2;
