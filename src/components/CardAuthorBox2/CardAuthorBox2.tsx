import React, { type FC } from 'react';
import { HiArrowRight } from 'react-icons/hi2';
import Avatar from '@/components/Avatar/Avatar';
import NcImage from '@/components/NcImage/NcImage';
import Link from 'next/link';
import type { UserWithRelations } from '@/types/types';

export interface CardAuthorBox2Props {
  className?: string;
  author: UserWithRelations;
}

const CardAuthorBox2: FC<CardAuthorBox2Props> = ({ className = '', author }) => {
  const { name, id, image, profile, _count } = author;
  const postCount = _count?.posts || 0;
  const jobName = profile?.jobName || 'نویسنده';
  const bgImage = author.profile?.bgImage || '/images/placeholder-small.png';

  return (
    <Link
      href={`/author/${id}`}
      className={`nc-CardAuthorBox2 flex flex-col overflow-hidden bg-white dark:bg-neutral-800 rounded-3xl ${className}`}
    >
      <div className="relative flex-shrink-0">
        <div>
          <NcImage
            alt="author"
            containerClassName="flex aspect-w-7 aspect-h-5 w-full h-0"
            src={bgImage}
            fill
            sizes="(max-width: 600px) 480px, 33vw"
          />
        </div>
        <div className="absolute top-3 inset-x-3 flex justify-end">
          <div className="py-1 px-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center leading-none text-xs font-medium">
            <HiArrowRight className="w-5 h-5 text-yellow-600 ml-3 rtl:rotate-180" />
            {postCount}
          </div>
        </div>
      </div>

      <div className="-mt-8 mx-auto mb-8 flex flex-col items-center">
        <Avatar
          containerClassName="ring-2 ring-white"
          sizeClass="w-16 h-16 text-2xl"
          radius="rounded-full"
          imgUrl={image || '/images/default-avatar.png'}
          userName={name}
        />
        <div className="mt-3 text-center">
          <h2 className={'text-base font-medium'}>
            <span className="line-clamp-1">{name}</span>
          </h2>
          <span className={'block mt-1 text-sm text-neutral-500 dark:text-neutral-400'}>
            @{jobName}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CardAuthorBox2;
