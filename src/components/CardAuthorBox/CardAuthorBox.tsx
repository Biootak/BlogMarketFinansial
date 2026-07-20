'use client';

import type { TopAuthor } from '@/actions/getTopAuthors';
import Avatar from '@/components/Avatar/Avatar';
import { heading, radius, text } from '@/lib/design-tokens';
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
      <div
        className={[
          'nc-CardAuthorBox relative flex flex-col items-center justify-center text-center',
          'p-3 sm:p-5',
          'bg-white dark:bg-neutral-800/80',
          'border border-neutral-100 dark:border-neutral-700/50',
          'h-full group overflow-hidden',
          'hover:-translate-y-1.5 transition-transform duration-300',
          radius.lg,
        ].join(' ')}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-transparent to-primary-50/30 dark:from-primary-900/20 dark:to-primary-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

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

        <div className="relative z-10">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md" />
          <div className="relative group-hover:scale-105 transition-transform duration-300">
            <div className="ring-2 sm:ring-4 ring-white dark:ring-neutral-700 rounded-full shadow-xl group-hover:ring-primary-200 dark:group-hover:ring-primary-800 transition-all duration-300">
              <Avatar
                sizeClass="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-base sm:text-lg"
                radius="rounded-full"
                imgUrl={profile?.avatar || image}
                userName={name ?? ''}
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-2 sm:mt-4 w-full">
          <h2
            className={[
              heading.h4,
              'truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors',
            ].join(' ')}
          >
            {name ?? 'نویسنده ناشناس'}
          </h2>
          <span className={['block mt-0.5 sm:mt-1 truncate', text.meta].join(' ')}>
            {profile?.jobName ?? 'نویسنده'}
          </span>
        </div>

        <div className="relative z-10 mt-2 sm:mt-4 w-full">
          <div className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-neutral-100 dark:bg-neutral-700/50 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 rounded-full transition-all duration-300">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-500 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            <span className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-primary-700 dark:group-hover:text-primary-300">
              {_count?.posts ?? 0} مقاله
            </span>
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 group-hover:text-primary-500 group-hover:-translate-x-1 transition-all" />
          </div>
        </div>

        <div className="absolute bottom-0 start-0 end-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </Link>
  );
};

export default CardAuthorBox;
