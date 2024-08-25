'use client';

import type React from 'react';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { savePost } from '@/actions/postActions';
import { useToast } from '@/components/ui/use-toast';

export interface NcBookmarkProps {
  containerClassName?: string;
  postId: string;
  initialBookmarked: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

const NcBookmark: React.FC<NcBookmarkProps> = ({
  containerClassName = 'h-8 w-8 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700',
  postId,
  initialBookmarked,
  onBookmarkChange,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleClick = () => {
    startTransition(async () => {
      const result = await savePost(postId);
      if (result.success) {
        const newBookmarkedState = !isBookmarked;
        setIsBookmarked(newBookmarkedState);
        if (onBookmarkChange) {
          onBookmarkChange(newBookmarkedState);
        }
        toast({
          title: 'موفقیت',
          description: result.message,
          variant: 'success',
        });
      } else {
        toast({
          title: 'خطا',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <button
      type="button"
      className={cn(
        'nc-NcBookmark relative pb-1 rounded-full flex items-center justify-center',
        containerClassName,
        { 'opacity-50 cursor-not-allowed': isPending },
      )}
      onClick={handleClick}
      disabled={isPending}
      title="ذخیره در لیست خواندن"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        fill={isBookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        className="w-[24px] h-[24px] dark:stroke-neutral-300"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
        />
        <title>{isBookmarked ? 'ذخیره شده' : 'ذخیره نشده'}</title>
      </svg>
    </button>
  );
};

export default NcBookmark;
