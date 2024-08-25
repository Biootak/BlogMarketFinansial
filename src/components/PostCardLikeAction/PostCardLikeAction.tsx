'use client';

import React, { type FC, useState, useCallback } from 'react';
import { useTransition } from 'react';
import { motion } from 'framer-motion';
import { likeItem } from '@/actions/postActions';
import convertNumbThousand from '@/utils/convertNumbThousand';
import { cn } from '@/lib/utils';

export interface PostCardLikeActionProps {
  className?: string;
  postId: string;
  initialLikeCount: number;
  initialLiked: boolean;
}

const PostCardLikeAction: FC<PostCardLikeActionProps> = ({
  className = 'px-2 h-8 text-xs',
  postId,
  initialLikeCount,
  initialLiked,
}) => {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isPending, startTransition] = useTransition();

  const handleLikeClick = useCallback(() => {
    if (!postId) return;

    startTransition(async () => {
      const newLikeState = !isLiked;
      setIsLiked(newLikeState);
      setLikeCount((prevCount) => (newLikeState ? prevCount + 1 : Math.max(0, prevCount - 1)));

      const result = await likeItem(postId, 'post');
      if (!result.success) {
        // Revert the optimistic update if the server action fails
        setIsLiked(!newLikeState);
        setLikeCount((prevCount) => (newLikeState ? Math.max(0, prevCount - 1) : prevCount + 1));
        // You might want to show an error message here
      }
    });
  }, [postId, isLiked]);

  return (
    <motion.button
      type="button"
      className={cn(
        'nc-PostCardLikeAction relative min-w-[40px] flex items-center rounded-full leading-none group transition-colors',
        className,
        isLiked
          ? 'text-rose-600 bg-rose-50 dark:bg-rose-100'
          : 'text-neutral-700 bg-neutral-50 dark:text-neutral-200 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-100 hover:text-rose-600 dark:hover:text-rose-500',
      )}
      onClick={handleLikeClick}
      title={isLiked ? 'برداشتن لایک' : 'لایک کردن'}
      disabled={isPending}
      whileTap={{ scale: 0.95 }}
    >
      <motion.svg
        width="24"
        height="24"
        fill={isLiked ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 0.3 }}
      >
        <path
          fillRule="evenodd"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1"
          d="M11.995 7.23319C10.5455 5.60999 8.12832 5.17335 6.31215 6.65972C4.49599 8.14609 4.2403 10.6312 5.66654 12.3892L11.995 18.25L18.3235 12.3892C19.7498 10.6312 19.5253 8.13046 17.6779 6.65972C15.8305 5.18899 13.4446 5.60999 11.995 7.23319Z"
          clipRule="evenodd"
        />
        <title>لایک</title>
      </motion.svg>

      {likeCount > 0 && (
        <span
          className={cn(
            'mr-1 rtl:ml-1 rtl:mr-0',
            isLiked ? 'text-rose-600' : 'text-neutral-900 dark:text-neutral-200',
          )}
        >
          {convertNumbThousand(likeCount)}
        </span>
      )}
    </motion.button>
  );
};

export default PostCardLikeAction;
