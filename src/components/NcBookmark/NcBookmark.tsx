'use client';

import { savePost } from '@/actions/postActions';
import { tapScaleSmall, transitions } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useState, useTransition } from 'react';
import { Icon } from '../ui/icon';

export interface NcBookmarkProps {
  containerClassName?: string;
  postId: string;
  initialBookmarked: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
  showToast?: boolean;
}

const NcBookmark: React.FC<NcBookmarkProps> = ({
  containerClassName = '',
  postId,
  initialBookmarked,
  onBookmarkChange,
  showToast = false,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    startTransition(async () => {
      // Optimistic update - فوری UI رو آپدیت می‌کنه
      const newState = !isBookmarked;
      setIsBookmarked(newState);

      try {
        const result = await savePost(postId);
        if (result.success) {
          if (onBookmarkChange) {
            onBookmarkChange(newState);
          }
        } else {
          // اگر خطا داشت، به حالت قبلی برمی‌گرده
          setIsBookmarked(!newState);
        }
      } catch (_error) {
        // در صورت خطا، به حالت قبلی برمی‌گرده
        setIsBookmarked(!newState);
      }
    });
  };

  return (
    <div className="relative">
      <motion.button
        type="button"
        className={cn(
          'nc-NcBookmark w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200',
          containerClassName,
          isBookmarked
            ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/50 shadow-sm'
            : 'text-neutral-600 bg-white/80 dark:text-neutral-300 dark:bg-neutral-800/80 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md',
          'backdrop-blur-sm',
          isPending && 'opacity-70 cursor-wait',
        )}
        onClick={handleClick}
        disabled={isPending}
        title={isBookmarked ? 'حذف از ذخیره‌ها' : 'ذخیره پست'}
        aria-label={isBookmarked ? 'حذف از ذخیره‌ها' : 'ذخیره پست'}
        whileTap={tapScaleSmall}
        transition={transitions.snappy}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isBookmarked ? 'bookmarked' : 'not-bookmarked'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={transitions.snappy}
          >
            <Icon
              name="Bookmark"
              className="size-4 sm:size-4.5"
              strokeWidth={isBookmarked ? 0 : 2}
              style={{ fill: isBookmarked ? 'currentColor' : 'none' }}
            />
          </motion.div>
        </AnimatePresence>
      </motion.button>

      {/* نشانگر کوچک برای وضعیت ذخیره شده */}
      <AnimatePresence>
        {isBookmarked && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={transitions.bouncy}
            className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center shadow-sm"
          >
            ✓
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NcBookmark;
