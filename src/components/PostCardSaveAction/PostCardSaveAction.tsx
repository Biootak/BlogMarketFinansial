'use client';

import { fadeUpVariants, hoverScaleSmall, tapScaleSmall, transitions } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
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
    <motion.div
      className={cn(
        'nc-PostCardSaveAction flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300',
        className,
      )}
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
    >
      {!hideReadingTime && !!readingTime && (
        <motion.span
          whileHover={hoverScaleSmall}
          whileTap={tapScaleSmall}
          transition={transitions.snappy}
          className="cursor-default"
        >
          {readingTime} دقیقه مطالعه
        </motion.span>
      )}

      <NcBookmark
        containerClassName={cn(bookmarkClass, 'rtl:mr-2')}
        postId={postId}
        initialBookmarked={initialBookmarked}
        showToast={showToast}
      />
    </motion.div>
  );
};

export default PostCardSaveAction;
