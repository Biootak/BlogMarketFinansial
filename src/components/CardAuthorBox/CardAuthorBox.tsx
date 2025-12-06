'use client';

import type { TopAuthor } from '@/actions/getTopAuthors';
import Avatar from '@/components/Avatar/Avatar';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

export interface CardAuthorBoxProps {
  className?: string;
  author: TopAuthor;
  index?: number;
}

const CardAuthorBox: FC<CardAuthorBoxProps> = ({ className = '', author, index = 0 }) => {
  const { id, name, image, profile, _count } = author;
  const isTopThree = index < 3;

  return (
    <Link href={`/author/${id}`} className={`block ${className}`}>
      <motion.div
        className="nc-CardAuthorBox relative flex flex-col items-center justify-center text-center p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-700/50 h-full group overflow-hidden"
        whileHover={{ y: -6 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-transparent to-primary-50/30 dark:from-primary-900/20 dark:to-primary-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rank Badge for Top 3 */}
        {isTopThree && (
          <div
            className={`absolute top-2 sm:top-3 end-2 sm:end-3 z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg ${
              index === 0
                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                : index === 1
                  ? 'bg-gradient-to-br from-neutral-300 to-neutral-400 text-neutral-800'
                  : 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
            }`}
          >
            {index + 1}
          </div>
        )}

        {/* Avatar */}
        <div className="relative z-10">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-md" />
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <div className="ring-2 sm:ring-4 ring-white dark:ring-neutral-700 rounded-full shadow-xl group-hover:ring-primary-200 dark:group-hover:ring-primary-800 transition-all duration-300">
              <Avatar
                sizeClass="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-lg sm:text-2xl"
                radius="rounded-full"
                imgUrl={profile?.avatar || image}
                userName={name ?? ''}
              />
            </div>
          </motion.div>
        </div>

        {/* Info */}
        <div className="relative z-10 mt-2 sm:mt-4 w-full">
          <h2 className="text-sm sm:text-base lg:text-lg font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
            {name ?? 'نویسنده ناشناس'}
          </h2>
          <span className="block mt-0.5 sm:mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {profile?.jobName ?? 'نویسنده'}
          </span>
        </div>

        {/* Stats Button */}
        <div className="relative z-10 mt-2 sm:mt-4 w-full">
          <div className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-neutral-100 dark:bg-neutral-700/50 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 rounded-full transition-all duration-300">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-500 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            <span className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-primary-700 dark:group-hover:text-primary-300">
              {_count?.posts ?? 0} مقاله
            </span>
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 group-hover:text-primary-500 group-hover:-translate-x-1 transition-all" />
          </div>
        </div>

        {/* Bottom Decoration */}
        <div className="absolute bottom-0 start-0 end-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </motion.div>
    </Link>
  );
};

export default CardAuthorBox;
