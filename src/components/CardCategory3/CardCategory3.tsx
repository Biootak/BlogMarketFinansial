import React, { type FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { TaxonomyType } from '@/types/types';
import { heading, text, radius } from '@/lib/design-tokens';

export interface CardCategory3Props {
  className?: string;
  taxonomy: TaxonomyType;
}

const CardCategory3: FC<CardCategory3Props> = ({ className = '', taxonomy }) => {
  const { count, name, thumbnail } = taxonomy;
  return (
    <Link href={`/archive/category/${name}`} className={`nc-CardCategory3 flex flex-col ${className}`}>
      <div className={`flex-shrink-0 relative w-full aspect-[1/1] ${radius.md} overflow-hidden group`}>
        <Image
          src={thumbnail || '/images/placeholder-small.png'}
          className="object-cover w-full h-full rounded-2xl"
          sizes="(min-width: 1024px) 20rem, (min-width: 640px) 16rem, 12rem"
          fill
          alt={name}
        />
        <span className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black bg-opacity-10 transition-opacity" />
      </div>
      <div className="mt-3">
        <h2 className={[heading.h4, 'text-neutral-900 dark:text-neutral-100'].join(' ')}>
          {name}
        </h2>
        <span className={['block mt-0.5', text.bodySm, 'text-neutral-6000 dark:text-neutral-400'].join(' ')}>
          {count} Articles
        </span>
      </div>
    </Link>
  );
};

export default CardCategory3;
