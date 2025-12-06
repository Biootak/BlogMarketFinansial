import type { TopAuthor } from '@/actions/getTopAuthors';
import Avatar from '@/components/Avatar/Avatar';
import NcImage from '@/components/NcImage/NcImage';
import Link from 'next/link';
import React, { type FC } from 'react';
import { ArrowRight } from 'lucide-react';;;

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
      className={`nc-CardAuthorBox2 group relative flex flex-col items-center justify-center text-center rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${className}`}
    >
      <div className="relative w-full">
        <NcImage
          alt="author"
          containerClassName="flex w-full"
          src={bgImage}
          fill
          sizes="(max-width: 600px) 480px, 33vw"
          ratio="7/5"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 inset-x-3 flex justify-end">
          <div className="py-1.5 px-3 bg-white/90 dark:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center leading-none text-xs font-semibold shadow-sm">
            <ArrowRight className="w-4 h-4 text-yellow-600 ml-2 rtl:rotate-180" />
            <span className="text-neutral-700 dark:text-neutral-200">{postCount} مقاله</span>
          </div>
        </div>
      </div>

      <div className="-mt-10 mx-auto mb-6 flex flex-col items-center relative z-10">
        <Avatar
          containerClassName="ring-4 ring-white dark:ring-neutral-900 shadow-xl"
          sizeClass="w-20 h-20 text-2xl"
          radius="rounded-full"
          imgUrl={avatar}
          userName={name}
        />
        <div className="mt-4 px-4">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            <span className="line-clamp-1">{name}</span>
          </h2>
          <span className="block mt-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            @{jobName}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CardAuthorBox2;
