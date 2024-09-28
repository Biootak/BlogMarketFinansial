'use client';

import React from 'react';
import Link from 'next/link';
import { HiTag } from 'react-icons/hi2';
import type { Tag as TagType } from '@prisma/client';

export interface TagProps {
  className?: string;
  tag: TagType;
  hideCount?: boolean;
  postCount?: number;
  onClick?: () => void;
}

const Tag: React.FC<TagProps> = ({
  className = '',
  tag,
  hideCount = false,
  postCount,
  onClick,
}) => {
  const tagColor = 'rgb(var(--c-primary-500))';

  return (
    <span className={onClick ? 'inline-block cursor-pointer' : 'inline-block'}>
      <Link
        className={`
          nc-Tag group flex items-center bg-white dark:bg-neutral-800 
          hover:bg-neutral-50 dark:hover:bg-neutral-700 
          text-sm text-neutral-700 dark:text-neutral-300 
          py-2 px-3 rounded-lg md:py-2.5 md:px-4 
          transition-colors duration-300 
          ${className}
        `}
        href={onClick ? '#' : `/archive/tag/${tag.slug}`}
        style={{ borderLeft: `3px solid ${tagColor}` }}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <HiTag className="w-4 h-4 ml-2 text-neutral-500 dark:text-neutral-400 group-hover:text-primary-500 dark:group-hover:text-primary-400" />
        <span>{tag.name}</span>
        {!hideCount && postCount !== undefined && (
          <span className="text-xs font-normal ml-1 rtl:mr-1 text-neutral-500 dark:text-neutral-400">
            ({postCount})
          </span>
        )}
      </Link>
    </span>
  );
};

export default React.memo(Tag);
