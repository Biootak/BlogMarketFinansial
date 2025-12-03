import React, { type FC } from 'react';

import Link from 'next/link';
import Image from 'next/image';
import type { TaxonomyType } from '@/types/types';

export interface CardCategory3Props {
  className?: string;
  taxonomy: TaxonomyType;
}

const CardCategory3: FC<CardCategory3Props> = ({ className = '', taxonomy }) => {
  const { count, name, thumbnail } = taxonomy;
  return (
    <Link href={`/archive/category/${name}`} className={`nc-CardCategory3 flex flex-col ${className}`}>
      <div className="flex-shrink-0 relative w-full aspect-[1/1] rounded-2xl overflow-hidden group">
        <Image
          src={thumbnail || ''}
          className="object-cover w-full h-full rounded-2xl"
          sizes="(min-width: 1024px) 20rem, (min-width: 640px) 16rem, 12rem"
          fill
          alt=""
        />
        <span className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black bg-opacity-10 transition-opacity" />
      </div>
      <div className="mt-4 ">
        <h2 className={'text-base text-neutral-900 dark:text-neutral-100 font-semibold '}>
          {name}
        </h2>
        <span className={'block mt-1 text-sm text-neutral-6000 dark:text-neutral-400'}>
          {count} Articles
        </span>
      </div>
    </Link>
  );
};

export default CardCategory3;
