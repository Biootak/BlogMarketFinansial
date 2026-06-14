import React, { type FC } from 'react';
import Badge from '@/components/Badge/Badge';
import Link from 'next/link';
import Image from 'next/image';
import { HiArrowRight } from 'react-icons/hi2';
import type { TaxonomyType, TwMainColor } from '@/types/types';
import { heading, radius } from '@/lib/design-tokens';

export interface CardCategory5Props {
  className?: string;
  taxonomy: TaxonomyType;
}

const CardCategory5: FC<CardCategory5Props> = ({ className = '', taxonomy }) => {
  const { count, name, thumbnail, color } = taxonomy;

  return (
    <Link href={`/archive/category/${name}`} className={`nc-CardCategory5 relative block group ${className}`}>
      <div
        className={[
          'flex-shrink-0 relative w-full aspect-[8/5] overflow-hidden z-0 group',
          radius.lg,
        ].join(' ')}
      >
        <Image
          fill
          alt={name}
          src={thumbnail || '/images/placeholder-small.png'}
          className="object-cover w-full h-full rounded-2xl"
          sizes="(min-width: 1024px) 20rem, (min-width: 640px) 16rem, 12rem"
        />
        <span className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-colors" />
      </div>
      <Badge
        className="absolute top-3 end-3"
        color={color as TwMainColor}
        name={
          <div className="flex items-center">
            {count}
            <HiArrowRight className="ms-1.5 w-3.5 h-3.5 rtl:rotate-180" />
          </div>
        }
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <h2
          className={[
            'px-3 py-1.5 sm:px-5 sm:py-2',
            'bg-white text-neutral-900 bg-opacity-50 backdrop-blur-lg',
            'rounded-full border-2 border-white border-opacity-60',
            'text-sm sm:text-base font-semibold',
          ].join(' ')}
        >
          {name}
        </h2>
      </div>
    </Link>
  );
};

export default CardCategory5;
