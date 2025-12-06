import { cn } from '@/lib/utils';
import convertNumbThousand from '@/utils/convertNumbThousand';
import Link from 'next/link';
import type React from 'react';
import type { FC } from 'react';
import { Icon } from '../ui/icon';

export interface PostCardCommentBtnProps {
  className?: string;
  isATagOnSingle?: boolean;
  commentCount: number;
  postSlug: string;
}

const PostCardCommentBtn: FC<PostCardCommentBtnProps> = ({
  className = '',
  isATagOnSingle = false,
  commentCount,
  postSlug,
}) => {
  if (!postSlug) return null;

  const commentUrl = isATagOnSingle ? '#comments' : `/single/${postSlug}#comments`;

  const commonClasses = cn(
    'nc-PostCardCommentBtn relative flex items-center justify-center',
    'w-10 h-10 rounded-full transition-all duration-200',
    'text-neutral-700 bg-neutral-50 hover:bg-teal-50 hover:text-teal-600 hover:scale-105 active:scale-95',
    'dark:text-neutral-200 dark:bg-neutral-800 dark:hover:bg-teal-100 dark:hover:text-teal-500',
    className,
  );

  const Content = () => (
    <>
      <Icon name="MessageSquare" className="size-5" strokeWidth={1.5} />
      {commentCount > 0 && (
        <span className="absolute -top-2 -right-2 text-xs bg-teal-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
          {convertNumbThousand(commentCount)}
        </span>
      )}
    </>
  );

  if (isATagOnSingle) {
    return (
      <div className={commonClasses}>
        <a href={commentUrl} title="نظرات" aria-label="مشاهده نظرات">
          <Content />
        </a>
      </div>
    );
  }

  return (
    <div className={commonClasses}>
      <Link href={commentUrl} title="نظرات" aria-label="مشاهده نظرات">
        <Content />
      </Link>
    </div>
  );
};

export default PostCardCommentBtn;
