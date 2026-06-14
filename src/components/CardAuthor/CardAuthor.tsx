import type React from 'react';
import Link from 'next/link';
import Avatar from '@/components/Avatar/Avatar';
import type { UserWithProfile } from '@/types/types';
import { heading, text } from '@/lib/design-tokens';

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
        sizeClass="h-9 w-9 text-sm"
        containerClassName="flex-shrink-0 me-3"
        radius="rounded-full"
        imgUrl={profile?.avatar}
        userName={name}
      />
      <div>
        <h2 className={heading.h4}>{name}</h2>
        {profile?.jobName && (
          <span className={['block mt-0.5', text.meta].join(' ')}>
            {profile.jobName}
          </span>
        )}
      </div>
    </Link>
  );
};

export default CardAuthor;
