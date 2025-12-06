import Avatar from '@/components/Avatar/Avatar';
import React, { type FC } from 'react';

import type { PostWithRelations } from '@/types/types';
import { formatDate } from '@/utils/formatDate';
import Link from 'next/link';
import FormattedDate from '../FormattedDate';

export interface PostCardMetaV2Props {
  meta: Pick<PostWithRelations, 'createdAt' | 'author' | 'title'>;
  hiddenAvatar?: boolean;
  className?: string;
  titleClassName?: string;
  avatarSize?: string;
}

const PostCardMetaV2: FC<PostCardMetaV2Props> = ({
  meta,
  hiddenAvatar = false,
  className = 'leading-none text-xs',
  titleClassName = 'text-base',
  avatarSize = 'h-9 w-9 text-base',
}) => {
  const { createdAt, author, title } = meta;
  return (
    <div
      className={`nc-PostCardMetaV2 inline-flex items-center flex-wrap text-neutral-800 dark:text-neutral-200 ${className}`}
    >
      <div className="relative flex items-center gap-2">
        {!hiddenAvatar && (
          <Avatar
            radius="rounded-full"
            sizeClass={avatarSize}
            imgUrl={author.profile?.avatar || author.image}
            userName={author.name}
          />
        )}
        <div>
          <h2 className={`block font-semibold ${titleClassName}`}>
            <Link href={`/author/${author.id}`} className="line-clamp-1">
              {title}
            </Link>
          </h2>

          <Link href={`/author/${author.id}`} className="flex mt-1.5">
            <span className="block text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white font-medium">
              {author.name}
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 mx-[6px] font-medium">·</span>
            <span className="text-neutral-500 dark:text-neutral-400 font-normal">
              <FormattedDate date={createdAt} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PostCardMetaV2;
