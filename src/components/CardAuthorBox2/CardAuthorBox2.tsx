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
  const { name, id, image, _count } = author;
  const postCount = _count?.posts || 0;
  const jobName = author.profile?.jobName || 'نویسنده';
  const bgImage = author.profile?.bgImage || '/images/placeholder-small.png';
  const avatar = author.profile?.avatar || image;

  return (
    <Link
      href={`/author/${id}`}
      className={`nc-CardAuthorBox2 group flex flex-col overflow-hidden bg-white dark:bg-neutral-800 rounded-3xl w-full min-w-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${className}`}
    >
      <div className="relative flex-shrink-0 overflow-hidden">
        <div className="w-full h-40 sm:h-48 md:h-56 lg:h-64 relative">
          <NcImage
            alt="author"
            containerClassName="flex w-full h-full"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            src={bgImage}
            fill
            sizes="(max-width: 600px) 480px, 33vw"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
          {/* Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </div>
        <div className="absolute top-3 inset-x-3 flex justify-end z-10">
          <div className="group/badge relative py-2 px-6 bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 dark:from-yellow-500 dark:via-orange-500 dark:to-pink-500 rounded-full flex items-center justify-center gap-2 leading-none text-sm font-bold text-white shadow-lg hover:shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 ring-2 ring-white/30">
            <span className="text-white font-bold">{postCount}</span>
            <HiArrowRight className="w-4 h-4 text-white ml-1 rtl:rotate-180 transition-transform duration-300 group-hover/badge:translate-x-1 rtl:group-hover/badge:-translate-x-1" />
          </div>
        </div>
      </div>

      <div className="-mt-10 mx-auto mb-8 flex flex-col items-center relative z-10">
        <div className="relative">
          <Avatar
            containerClassName="ring-4 ring-white dark:ring-neutral-800 shadow-xl group-hover:shadow-2xl transition-shadow duration-300"
            sizeClass="w-20 h-20 text-2xl"
            radius="rounded-full"
            imgUrl={avatar}
            userName={name}
          />
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
        </div>
        <div className="mt-4 px-3 text-center">
          <h2 className={'text-lg font-semibold group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300'}>
            <span className="line-clamp-1">{name}</span>
          </h2>
          <span className={'block mt-1.5 text-sm text-neutral-500 dark:text-neutral-400'}>
            @{jobName}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CardAuthorBox2;
