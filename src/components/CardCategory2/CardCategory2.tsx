'use client';

import React, { type FC } from 'react';
import NcImage from '@/components/NcImage/NcImage';
import type { TaxonomyType, TwMainColor } from '@/types/types';
import Link from 'next/link';
import { motion } from '@/lib/motion-shim';
import { FileText } from 'lucide-react';
import { heading, text, radius } from '@/lib/design-tokens';

export interface CardCategory2Props {
  className?: string;
  taxonomy: TaxonomyType & { count?: number };
  index?: string;
}

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', ring: 'ring-pink-500/30' },
  green: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/30' },
  yellow: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/30' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-500/30' },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-500/30' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/30' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500/30' },
  gray: { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-600 dark:text-neutral-400', ring: 'ring-neutral-500/30' },
};

const CardCategory2: FC<CardCategory2Props> = ({ className = '', taxonomy, index }) => {
  const { name, thumbnail, color, slug, count } = taxonomy;
  const colorStyle = colorMap[color as string] || colorMap.blue;

  return (
    <Link
      href={`/archive/category/${slug}`}
      className={`nc-CardCategory2 block h-full ${className}`}
    >
      <motion.div
        className={[
          'relative flex flex-col items-center justify-between text-center',
          'p-4 sm:p-5',
          'bg-white dark:bg-neutral-800/80',
          'border border-neutral-100 dark:border-neutral-700/50',
          'h-full group overflow-hidden',
          radius.md,
        ].join(' ')}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${colorStyle.bg}`} />

        {index && (
          <div className={`absolute top-3 end-3 z-10 w-7 h-7 rounded-full ${colorStyle.bg} ${colorStyle.text} flex items-center justify-center text-xs font-bold shadow-sm ring-2 ${colorStyle.ring}`}>
            {index}
          </div>
        )}

        <div className="relative z-10">
          <div className={`absolute -inset-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 blur-xl ${colorStyle.bg}`} />
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`absolute -inset-1 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <NcImage
              containerClassName="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-4 ring-white dark:ring-neutral-700 shadow-lg"
              src={thumbnail || '/images/placeholder-small.png'}
              sizes="80px"
              alt={`دسته‌بندی ${name}`}
              className="object-cover"
            />
          </motion.div>
        </div>

        <div className="relative z-10 mt-3 w-full">
          <h2 className={[heading.h4, 'truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors'].join(' ')}>
            {name}
          </h2>
          <div className="flex items-center justify-center gap-1.5 mt-1.5 text-neutral-500 dark:text-neutral-400">
            <FileText className="w-3.5 h-3.5" />
            <span className="text-xs">{count} مقاله</span>
          </div>
        </div>

        <div className={`absolute bottom-0 start-0 end-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      </motion.div>
    </Link>
  );
};

export default CardCategory2;
