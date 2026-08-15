'use client';

import Avatar from '@/components/Avatar/Avatar';
import type { PostWithRelations } from '@/types/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Module-level singleton — shared across all PostCardMeta instances on the page
const _faDateFmt = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: false,
});

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
    setFormattedDate(_faDateFmt.format(new Date(createdAt)));
  }, [createdAt]);

  return (
    <div
      className={`nc-PostCardMeta inline-flex items-center flex-wrap text-neutral-800 dark:text-neutral-200 ${className}`}
    >
      {author && (
        <Link href={`/author/${author.id}`} className="relative flex items-center gap-2 font-sans">
          {!hiddenAvatar && (
            <Avatar
              radius="rounded-full"
              sizeClass={avatarSize}
              imgUrl={author.profile?.avatar || author.image}
              userName={author.name}
            />
          )}
          <span className="block font-medium">{author.name}</span>
        </Link>
      )}
      {author && formattedDate && (
        <span className="text-neutral-600 dark:text-neutral-400 mx-[6px]">·</span>
      )}
      <span className="font-normal text-neutral-600 dark:text-neutral-400 font-sans">
        {formattedDate}
      </span>
    </div>
  );
};

export default PostCardMeta;
