import React from 'react';
import type { SocialType } from '@/types/types';

interface SocialsListProps {
  className?: string;
  itemClass?: string;
  socials?: SocialType[];
}

const SocialsList: React.FC<SocialsListProps> = ({
  className = '',
  itemClass = '',
  socials = [],
}) => {
  return (
    <nav className={`flex flex-row-reverse gap-2 text-2xl ${className}`}>
      {socials.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.id}
            className={`${itemClass} rounded-full transition-colors hover:bg-gray-100  dark:hover:bg-neutral-700`}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            title={item.name}
          >
            <Icon className="w-6 h-6" style={{ color: item.color }} />
          </a>
        );
      })}
    </nav>
  );
};

export default React.memo(SocialsList);
