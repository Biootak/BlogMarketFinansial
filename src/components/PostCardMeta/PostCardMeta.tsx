'use client';

import { useState, useEffect } from 'react';
import type { PostWithRelations } from '@/types/types';
import Link from 'next/link';
import Avatar from '@/components/Avatar/Avatar';

export interface PostCardMetaProps {
  className?: string;
  meta: Pick<PostWithRelations, 'createdAt' | 'author'>;
  hiddenAvatar?: boolean;
  avatarSize?: string;
}

const PostCardMeta: React.FC<PostCardMetaProps> = ({
  className = 'leading-none text-xs',
  meta,
  hiddenAvatar = false,
  avatarSize = 'h-7 w-7 text-sm',
}) => {
  const { createdAt, author } = meta;
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    setFormattedDate(
      new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).format(new Date(createdAt)),
    );
  }, [createdAt]);

  return (
    <div
      className={`nc-PostCardMeta inline-flex items-center flex-wrap text-neutral-800 dark:text-neutral-200 ${className}`}
    >
      {author && (
        <Link
          href={`/author/${author.id}`}
          className="relative flex items-center space-x-2 rtl:space-x-reverse"
        >
          {!hiddenAvatar && (
            <Avatar
              radius="rounded-full"
              sizeClass={avatarSize}
              imgUrl={author.profile?.avatar || author.image}
              userName={author.name}
            />
          )}
          <div>
            <h4 className={'text-sm font-medium'}>
              {author.name || 'نویسنده ناشناس'}
            </h4>
          </div>
        </Link>
      )}
      <span className="text-neutral-500 dark:text-neutral-400 mx-[6px] font-medium">·</span>
      <span className="text-neutral-500 dark:text-neutral-400 font-normal">{formattedDate}</span>
    </div>
  );
};

export default PostCardMeta;
