'use client';

import { fadeVariants, hoverScaleSmall, transitions } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import React, { type FC } from 'react';
import { Calendar, Clock, Eye } from 'lucide-react';

export interface PostCardInfoProps {
  className?: string;
  views?: number;
  readingTime?: number;
  publishDate?: Date | string;
  showViews?: boolean;
  showReadingTime?: boolean;
  showDate?: boolean;
  compact?: boolean;
}

const PostCardInfo: FC<PostCardInfoProps> = ({
  className = '',
  views = 0,
  readingTime = 0,
  publishDate,
  showViews = true,
  showReadingTime = true,
  showDate = false,
  compact = false,
}) => {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}م`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}هزار`;
    }
    return num.toString();
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeVariants}
      className={cn(
        'flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400',
        compact && 'gap-1.5 sm:gap-2',
        className,
      )}
    >
      {showViews && (
        <motion.div
          whileHover={hoverScaleSmall}
          transition={transitions.snappy}
          className="flex items-center gap-1 sm:gap-1.5 transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <Eye 
            className={cn(
              'flex-shrink-0',
              compact ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4 sm:w-4.5 sm:h-4.5',
            )}
          />
          <span className="font-medium">{formatNumber(views)}</span>
        </motion.div>
      )}

      {showReadingTime && readingTime > 0 && (
        <motion.div
          whileHover={hoverScaleSmall}
          transition={transitions.snappy}
          className="flex items-center gap-1 sm:gap-1.5 transition-colors duration-200 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <Clock 
            className={cn(
              'flex-shrink-0',
              compact ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4 sm:w-4.5 sm:h-4.5',
            )}
          />
          <span className="font-medium">{readingTime} دقیقه</span>
        </motion.div>
      )}

      {showDate && publishDate && (
        <motion.div
          whileHover={hoverScaleSmall}
          transition={transitions.snappy}
          className="flex items-center gap-1 sm:gap-1.5 transition-colors duration-200 hover:text-purple-600 dark:hover:text-purple-400"
        >
          <Calendar 
            className={cn(
              'flex-shrink-0',
              compact ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4 sm:w-4.5 sm:h-4.5',
            )}
          />
          <span className="font-medium">{formatDate(publishDate)}</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PostCardInfo;
