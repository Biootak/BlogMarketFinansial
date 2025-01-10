'use client';

import type React from 'react';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { savePost } from '@/actions/postActions';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Icon } from '../ui/icon';

export interface NcBookmarkProps {
  containerClassName?: string;
  postId: string;
  initialBookmarked: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

const NcBookmark: React.FC<NcBookmarkProps> = ({
  containerClassName = '',
  postId,
  initialBookmarked,
  onBookmarkChange,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleClick = () => {
    startTransition(async () => {
      const result = await savePost(postId);
      if (result.success) {
        const newBookmarkedState = !isBookmarked;
        setIsBookmarked(newBookmarkedState);
        if (onBookmarkChange) {
          onBookmarkChange(newBookmarkedState);
        }
        toast({
          title: 'موفقیت',
          description: 'پست به علاقه‌مندی‌ها اضافه شد',
          variant: 'success',
        });
      } else {
        toast({
          title: 'خطا',
          description: 'خطا در افزودن به علاقه‌مندی‌ها',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="relative">
      <motion.button
        type="button"
        className={cn(
          'nc-NcBookmark w-10 h-10 rounded-full flex items-center justify-center transition-colors',
          containerClassName,
          isBookmarked
            ? 'text-blue-600 bg-blue-50 dark:bg-blue-900'
            : 'text-neutral-700 bg-neutral-50 dark:text-neutral-200 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400',
          { 'opacity-50 cursor-not-allowed': isPending },
        )}
        onClick={handleClick}
        disabled={isPending}
        title={isBookmarked ? 'حذف از لیست خواندن' : 'ذخیره در لیست خواندن'}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ scale: isBookmarked ? [1, 1.2, 1] : 1 }}
          transition={{ duration: 0.3 }}
        >
          <Icon
            name="Bookmark"
            className="size-5"
            strokeWidth={isBookmarked ? 0 : 2}
            style={{ fill: isBookmarked ? 'currentColor' : 'none' }}
          />
        </motion.div>
      </motion.button>
      {isBookmarked && (
        <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          ✓
        </span>
      )}
    </div>
  );
};

export default NcBookmark;
