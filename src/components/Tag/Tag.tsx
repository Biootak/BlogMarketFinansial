'use client';

import type { Tag as TagType } from '@prisma/client';
import Link from 'next/link';
import React from 'react';
import { HiHashtag } from 'react-icons/hi2';

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
  return (
    <span className={onClick ? 'inline-block cursor-pointer' : 'inline-block'}>
      <Link
        className={`
          nc-Tag group relative flex items-center gap-2
          px-4 py-2.5 rounded-xl
          bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-900
          border border-neutral-200/80 dark:border-neutral-700/80
          shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]
          hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]
          hover:border-primary-300 dark:hover:border-primary-700
          hover:-translate-y-0.5
          text-sm font-medium text-neutral-700 dark:text-neutral-300
          transition-all duration-200 ease-out
          overflow-hidden
          ${className}
        `}
        href={onClick ? '#' : `/archive/tag/${tag.slug}`}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {/* Hover Gradient Background */}
        <span className="absolute inset-0 bg-gradient-to-br from-primary-50 to-violet-50 dark:from-primary-950/50 dark:to-violet-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

        {/* Icon */}
        <span className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-primary-500 to-violet-500 shadow-sm shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow duration-200">
          <HiHashtag className="w-3.5 h-3.5 text-white" />
        </span>

        {/* Tag Name */}
        <span className="relative group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors duration-150">
          {tag.name}
        </span>

        {/* Post Count Badge */}
        {!hideCount && postCount !== undefined && (
          <span className="relative px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
            {postCount}
          </span>
        )}
      </Link>
    </span>
  );
};

export default React.memo(Tag);
