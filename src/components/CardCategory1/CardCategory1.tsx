import NcImage from '@/components/NcImage/NcImage';
import React, { type FC } from 'react';

import type { TaxonomyType } from '@/types/types';
import Link from 'next/link';

export interface CardCategory1Props {
  className?: string;
  taxonomy: TaxonomyType;
  size?: 'large' | 'normal';
}

const CardCategory1: FC<CardCategory1Props> = ({ className = '', size = 'normal', taxonomy }) => {
  const { count, name, thumbnail } = taxonomy;
  return (
    <Link
      href={`/archive/category/${taxonomy.slug}`}
      className={`nc-CardCategory1 flex items-center ${className}`}
    >
      <NcImage
        alt=""
        containerClassName={`relative flex-shrink-0 ${
          size === 'large' ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-10 h-10 sm:w-12 sm:h-12'
        } rounded-lg me-3 sm:me-4 overflow-hidden`}
        src={thumbnail || '/images/placeholder-small.png'}
        fill
        className="object-cover"
        sizes="80px"
      />
      <div className="flex-1 min-w-0">
        <h2
          className={`${
            size === 'large' ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
          } nc-card-title text-neutral-900 dark:text-neutral-100 font-medium sm:font-semibold truncate`}
        >
          {name}
        </h2>
        <span
          className={`${
            size === 'large' ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs'
          } block mt-0.5 sm:mt-[2px] text-neutral-500 dark:text-neutral-400`}
        >
          {count} مقاله ها
        </span>
      </div>
    </Link>
  );
};

export default CardCategory1;
