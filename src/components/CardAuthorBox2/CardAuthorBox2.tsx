import type { TopAuthor } from '@/actions/getTopAuthors';
import Avatar from '@/components/Avatar/Avatar';
import NcImage from '@/components/NcImage/NcImage';
import { heading, radius, text } from '@/lib/design-tokens';
import Link from 'next/link';
import React, { type FC } from 'react';
import { HiArrowRight } from 'react-icons/hi2';

export interface CardAuthorBox2Props {
  className?: string;
  author: TopAuthor;
}

const CardAuthorBox2: FC<CardAuthorBox2Props> = ({ className = '', author }) => {
  const { name, id, image, _count } = author;
  const postCount = _count?.posts || 0;
  const jobName = author.profile?.jobName || 'نویسنده';
  const bgImage = '/images/placeholder-small.png';
  const avatar = author.profile?.avatar || image;

  return (
    <Link
      href={`/author/${id}`}
      className={[
        'nc-CardAuthorBox2 group relative flex flex-col items-center justify-center text-center overflow-hidden',
        'bg-white dark:bg-neutral-900 shadow-lg hover:shadow-2xl',
        'transition-all duration-300 hover:-translate-y-1',
        radius.lg,
        className,
      ].join(' ')}
    >
      <div className="relative w-full">
        <NcImage
          alt="author"
          containerClassName="flex w-full"
          src={bgImage}
          fill
          sizes="(max-width: 600px) 480px, 33vw"
          ratio="7/5"
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute top-3 inset-x-3 flex justify-end">
          <div className="py-1.5 px-3 bg-white/90 dark:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center leading-none text-xs font-semibold shadow-sm">
            <HiArrowRight className="w-4 h-4 text-yellow-600 ml-2 rtl:rotate-180" />
            <span className="text-neutral-700 dark:text-neutral-200">{postCount} مقاله</span>
          </div>
        </div>
      </div>

      <div className="-mt-10 mx-auto mb-6 flex flex-col items-center relative z-10">
        <Avatar
          containerClassName="ring-4 ring-white dark:ring-neutral-900 shadow-xl"
          sizeClass="w-16 h-16 text-lg"
          radius="rounded-full"
          imgUrl={avatar}
          userName={name}
        />
        <div className="mt-3 px-4">
          <h2
            className={[
              heading.h3,
              'group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors',
            ].join(' ')}
          >
            <span className="line-clamp-1">{name}</span>
          </h2>
          <span className={['block mt-1', text.bodySm].join(' ')}>@{jobName}</span>
        </div>
      </div>
    </Link>
  );
};

export default CardAuthorBox2;
