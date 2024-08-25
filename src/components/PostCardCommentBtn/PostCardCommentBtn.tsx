import Link from 'next/link';
import React, { type FC } from 'react';
import { motion } from 'framer-motion';
import convertNumbThousand from '@/utils/convertNumbThousand';
import { cn } from '@/lib/utils';

export interface PostCardCommentBtnProps {
  className?: string;
  isATagOnSingle?: boolean;
  commentCount: number;
  postId: string;
}

const PostCardCommentBtn: FC<PostCardCommentBtnProps> = ({
  className = 'flex px-3 h-8 text-xs',
  isATagOnSingle = false,
  commentCount,
  postId,
}) => {
  if (!postId) return null;

  const commentUrl = isATagOnSingle ? '#comments' : `/post/${postId}#comments`;

  const CommentIcon = () => (
    <motion.svg
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1"
        d="M4.75 6.75C4.75 5.64543 5.64543 4.75 6.75 4.75H17.25C18.3546 4.75 19.25 5.64543 19.25 6.75V14.25C19.25 15.3546 18.3546 16.25 17.25 16.25H14.625L12 19.25L9.375 16.25H6.75C5.64543 16.25 4.75 15.3546 4.75 14.25V6.75Z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 11C9.5 11.2761 9.27614 11.5 9 11.5C8.72386 11.5 8.5 11.2761 8.5 11C8.5 10.7239 8.72386 10.5 9 10.5C9.27614 10.5 9.5 10.7239 9.5 11Z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12.5 11C12.5 11.2761 12.2761 11.5 12 11.5C11.7239 11.5 11.5 11.2761 11.5 11C11.5 10.7239 11.7239 10.5 12 10.5C12.2761 10.5 12.5 10.7239 12.5 11Z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.5 11C15.5 11.2761 15.2761 11.5 15 11.5C14.7239 11.5 14.5 11.2761 14.5 11C14.5 10.7239 14.7239 10.5 15 10.5C15.2761 10.5 15.5 10.7239 15.5 11Z"
      />
      <title>Comment</title>
    </motion.svg>
  );

  const CommentCount = () => (
    <span className="mr-1 rtl:ml-1 rtl:mr-0 text-neutral-900 dark:text-neutral-200">
      {convertNumbThousand(commentCount)}
    </span>
  );

  const commonClasses = cn(
    'nc-PostCardCommentBtn relative flex items-center justify-center min-w-[68px] rounded-full',
    'text-neutral-6000 bg-neutral-50 transition-colors',
    'dark:text-neutral-200 dark:bg-neutral-800',
    'hover:bg-teal-50 dark:hover:bg-teal-100 hover:text-teal-600 dark:hover:text-teal-500',
    className,
  );

  const Content = () => (
    <>
      <CommentIcon />
      <CommentCount />
    </>
  );

  if (isATagOnSingle) {
    return (
      <motion.a
        href={commentUrl}
        className={commonClasses}
        title="نظرات"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Content />
      </motion.a>
    );
  }

  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Link href={commentUrl} className={commonClasses} title="نظرات">
        <Content />
      </Link>
    </motion.div>
  );
};

export default PostCardCommentBtn;
