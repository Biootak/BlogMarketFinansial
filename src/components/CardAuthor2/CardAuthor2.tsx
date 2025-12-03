import React from 'react';
import Link from 'next/link';
import Avatar from '@/components/Avatar/Avatar';
import type { PostWithRelations } from '@/types/types';
import FormattedDate from '../FormattedDate';

export interface CardAuthor2Props {
  className?: string;
  post: PostWithRelations;
  hoverReadingTime?: boolean;
  lightText?: boolean;
}

const CardAuthor2 = ({ className = '', post, hoverReadingTime = true, lightText = false }: CardAuthor2Props) => {
  if (!post) {
    return null;
  }
  const { author, createdAt } = post;

  const { name: displayName, id: authorId, image: avatar } = author;
  const href = `/author/${authorId}`;

  const readingTime = Math.ceil(post.content.split(' ').length / 200);

  const nameClass = lightText 
    ? 'text-sm text-white hover:text-white/80 font-medium'
    : 'text-sm text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white font-medium';
  
  const dateClass = lightText
    ? 'flex items-center mt-1 text-xs text-neutral-200'
    : 'flex items-center mt-1 text-xs text-neutral-500 dark:text-neutral-400';

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
        <h2 className={nameClass}>
          {displayName}
        </h2>
        <span className={dateClass}>
          <FormattedDate date={createdAt} />
          {readingTime && hoverReadingTime && (
            <>
              <span className="hidden lg:inline mx-1 transition-opacity opacity-0 group-hover:opacity-100">
                ·
              </span>
              <span className="hidden lg:inline transition-opacity opacity-0 group-hover:opacity-100">
                {readingTime} دقیقه مطالعه
              </span>
            </>
          )}
        </span>
      </div>
    </Link>
  );
};

export default CardAuthor2;
