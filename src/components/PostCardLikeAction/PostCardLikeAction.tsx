'use client';

import { likeItem } from '@/actions/postActions';
import { cn } from '@/lib/utils';
import convertNumbThousand from '@/utils/convertNumbThousand';
import { motion } from 'framer-motion';
import React, { type FC, useState, useCallback } from 'react';
import { useTransition } from 'react';
import { Icon } from '../ui/icon';

export interface PostCardLikeActionProps {
  className?: string;
  postId: string;
  initialLikeCount: number;
  initialLiked: boolean;
}

const PostCardLikeAction: FC<PostCardLikeActionProps> = ({
  className = '',
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

      try {
        const result = await likeItem(postId, 'post');
        if (!result || !result.success) {
          throw new Error(result?.message || 'خطا در عملیات لایک');
        }
        if (result.success) {
          setIsLiked(!isLiked);
        }
      } catch {
        setIsLiked(!newLikeState);
        setLikeCount((prevCount) => (newLikeState ? Math.max(0, prevCount - 1) : prevCount + 1));
      }
    });
  }, [postId, isLiked]);

  return (
    <div className="relative">
      <motion.button
        type="button"
        className={cn(
          'nc-PostCardLikeAction w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95',
          className,
          isLiked
            ? 'text-rose-600 bg-rose-50 dark:bg-rose-100'
            : 'text-neutral-700 bg-neutral-50 dark:text-neutral-200 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-100 hover:text-rose-600 dark:hover:text-rose-500',
        )}
        onClick={handleLikeClick}
        title={isLiked ? 'برداشتن لایک' : 'لایک کردن'}
        aria-label={isLiked ? 'برداشتن لایک' : 'لایک کردن'}
        disabled={isPending}
      >
        <motion.div animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>
          <Icon
            name={isLiked ? 'Heart' : 'Heart'}
            className="size-5"
            strokeWidth={isLiked ? 0 : 2}
            style={{ fill: isLiked ? 'currentColor' : 'none' }}
          />
        </motion.div>
      </motion.button>
      {likeCount > 0 && (
        <span
          className={cn(
            'absolute -top-2 -right-2 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center',
            isLiked ? 'bg-rose-600' : 'bg-neutral-600',
          )}
        >
          {convertNumbThousand(likeCount)}
        </span>
      )}
    </div>
  );
};

export default PostCardLikeAction;
