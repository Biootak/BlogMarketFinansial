'use client';

import { motion } from '@/lib/motion-shim';
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
}

const PostCardSaveAction: FC<PostCardSaveActionProps> = ({
  className = '',
  bookmarkClass = '',
  hideReadingTime = true,
  readingTime = 3,
  postId,
  initialBookmarked,
}) => {
  return (
    <motion.div
      className={cn(
        'nc-PostCardSaveAction flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300',
        className,
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {!hideReadingTime && !!readingTime && (
        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          {readingTime} دقیقه مطالعه
        </motion.span>
      )}

      <NcBookmark
        containerClassName={cn(bookmarkClass, 'rtl:mr-2')}
        postId={postId}
        initialBookmarked={initialBookmarked}
        onBookmarkChange={(newBookmarkedState) => {
          // اینجا می‌توانید هر عملیاتی که نیاز دارید پس از تغییر وضعیت bookmark انجام دهید
          console.log('Bookmark state changed:', newBookmarkedState);
        }}
      />
    </motion.div>
  );
};

export default PostCardSaveAction;
