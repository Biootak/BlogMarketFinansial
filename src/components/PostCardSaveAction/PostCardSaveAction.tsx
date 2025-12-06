'use client';

import { cn } from '@/lib/utils';
import React, { type FC } from 'react';
import NcBookmark from '../NcBookmark/NcBookmark';

export interface PostCardSaveActionProps {
  className?: string;
  bookmarkClass?: string;
  readingTime?: number;
  hideReadingTime?: boolean;
  postId: string;
  initialBookmarked: boolean;
  showToast?: boolean;
}

const PostCardSaveAction: FC<PostCardSaveActionProps> = ({
  className = '',
  bookmarkClass = '',
  hideReadingTime = true,
  readingTime = 3,
  postId,
  initialBookmarked,
  showToast = false,
}) => {
  return (
    <div
      className={cn(
        'nc-PostCardSaveAction flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300',
        className,
      )}
    >
      {!hideReadingTime && !!readingTime && (
        <span
          className="cursor-default hover:scale-102 active:scale-98 transition-transform duration-200"
        >
          {readingTime} دقیقه مطالعه
        </span>
      )}

      <NcBookmark
        containerClassName={cn(bookmarkClass, 'rtl:mr-2')}
        postId={postId}
        initialBookmarked={initialBookmarked}
        showToast={showToast}
      />
    </div>
  );
};

export default PostCardSaveAction;
