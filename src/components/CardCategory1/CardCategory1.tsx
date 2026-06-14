import React, { type FC } from 'react';
import NcImage from '@/components/NcImage/NcImage';
import Link from 'next/link';
import type { TaxonomyType } from '@/types/types';
import { heading, text, radius } from '@/lib/design-tokens';

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
          size === 'large' ? 'w-16 h-16' : 'w-10 h-10'
        } ${radius.md} me-3 overflow-hidden`}
        src={thumbnail || '/images/placeholder-small.png'}
        fill
        className="object-cover"
        sizes="80px"
      />
      <div>
        <h2 className={[heading.h4, 'text-neutral-900 dark:text-neutral-100'].join(' ')}>
          {name}
        </h2>
        <span className={['block mt-0.5', text.meta].join(' ')}>
          {count} مقاله ها
        </span>
      </div>
    </Link>
  );
};

export default CardCategory1;
