import Link from 'next/link';
import type React from 'react';
import type { FC } from 'react';
import { motion } from 'framer-motion';
import convertNumbThousand from '@/utils/convertNumbThousand';
import { cn } from '@/lib/utils';
import { Icon } from '../ui/icon';

export interface PostCardCommentBtnProps {
  className?: string;
  isATagOnSingle?: boolean;
  commentCount: number;
  postId: string;
}

const PostCardCommentBtn: FC<PostCardCommentBtnProps> = ({
  className = '',
  isATagOnSingle = false,
  commentCount,
  postId,
}) => {
  if (!postId) return null;

  const commentUrl = isATagOnSingle ? '#comments' : `/post/${postId}#comments`;

  const commonClasses = cn(
    'nc-PostCardCommentBtn relative flex items-center justify-center',
    'w-10 h-10 rounded-full transition-colors',
    'text-neutral-700 bg-neutral-50 hover:bg-teal-50 hover:text-teal-600',
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

  const MotionWrapper = ({ children }: { children: React.ReactNode }) => (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={commonClasses}>
      {children}
    </motion.div>
  );

  if (isATagOnSingle) {
    return (
      <MotionWrapper>
        <a href={commentUrl} title="نظرات">
          <Content />
        </a>
      </MotionWrapper>
    );
  }

  return (
    <MotionWrapper>
      <Link href={commentUrl} title="نظرات">
        <Content />
      </Link>
    </MotionWrapper>
  );
};

export default PostCardCommentBtn;
