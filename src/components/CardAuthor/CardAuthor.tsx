import type React from 'react';
import Link from 'next/link';
import Avatar from '@/components/Avatar/Avatar';
import type { UserWithProfile } from '@/types/types';

export interface CardAuthorProps {
  className?: string;
  author: UserWithProfile;
}

const CardAuthor: React.FC<CardAuthorProps> = ({ className = '', author }) => {
  const { name, profile, id } = author;
  const href = `/author/${id}`;

  return (
    <Link
      href={href}
      className={`nc-CardAuthor flex items-center ${className}`}
      aria-label={`View ${name}'s profile`}
    >
      <Avatar
        sizeClass="h-10 w-10 text-base"
        containerClassName="flex-shrink-0 me-4"
        radius="rounded-full"
        imgUrl={profile?.avatar}
        userName={name}
      />
      <div>
        <h2 className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 font-medium sm:font-semibold">
          {name}
        </h2>
        {profile?.jobName && (
          <span className="block mt-[2px] text-xs text-neutral-500 dark:text-neutral-400">
            {profile.jobName}
          </span>
        )}
      </div>
    </Link>
  );
};

export default CardAuthor;
