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
      className={`nc-CardCategory2 relative flex flex-col items-center justify-between text-center px-3 py-5 sm:p-6 bg-white dark:bg-neutral-900 rounded-3xl transition-colors h-full ${className}`}
    >
      <div className="flex flex-col items-center">
        {index && (
          <Badge
            color={color as TwMainColor}
            name={index}
            className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10"
          />
        )}
        <NcImage
          containerClassName="relative flex-shrink-0 w-20 h-20 rounded-full shadow-lg overflow-hidden z-0"
          src={thumbnail || '/images/placeholder-small.png'}
          sizes="80px"
          alt={`دسته‌بندی ${name}`}
          className="object-cover"
        />
      </div>
      <div className="mt-3 w-full">
        <h2 className={'text-base font-semibold truncate'}>{name}</h2>
        <span className={'block mt-1 text-sm text-neutral-500 dark:text-neutral-400 truncate'}>
          {count} مقاله
        </span>
      </div>
    </Link>
  );
};

export default CardCategory2;
