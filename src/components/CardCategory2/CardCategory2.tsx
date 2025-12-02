import React, { type FC } from 'react';
import NcImage from '@/components/NcImage/NcImage';
import type { TaxonomyType, TwMainColor } from '@/types/types';
import Badge from '@/components/Badge/Badge';
import Link from 'next/link';

export interface CardCategory2Props {
  className?: string;
  taxonomy: TaxonomyType & { count?: number };
  index?: string;
}

const CardCategory2: FC<CardCategory2Props> = ({ className = '', taxonomy, index }) => {
  const { name, thumbnail, color, slug, count } = taxonomy;
  return (
    <Link
      href={`/archive/category/${slug}`}
      className={`nc-CardCategory2 group relative flex flex-col items-center justify-between text-center px-3 py-5 sm:p-6 bg-white dark:bg-neutral-900 rounded-3xl transition-all duration-300 h-full shadow-md hover:shadow-xl hover:-translate-y-1 border border-neutral-100 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 ${className}`}
    >
      <div className="flex flex-col items-center relative">
        {index && (
          <Badge
            color={color as TwMainColor}
            name={index}
            className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 scale-100 group-hover:scale-110 transition-transform duration-300"
          />
        )}
        <div className="relative">
          <NcImage
            containerClassName="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-lg overflow-hidden z-0 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl"
            src={thumbnail || '/images/placeholder-small.png'}
            sizes="80px"
            alt={`دسته‌بندی ${name}`}
            className="object-cover"
          />
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
          <div className="absolute inset-0 rounded-full ring-2 ring-primary-300/0 group-hover:ring-primary-400/50 transition-all duration-300" />
        </div>
      </div>
      <div className="mt-4 sm:mt-5 w-full">
        <h2 className={'text-base sm:text-lg font-semibold truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300'}>
          {name}
        </h2>
        <span className={'block mt-1.5 text-sm text-neutral-500 dark:text-neutral-400 truncate'}>
          {count || 0} مقاله
        </span>
      </div>
      {/* Decorative gradient bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-3xl" />
    </Link>
  );
};

export default CardCategory2;
