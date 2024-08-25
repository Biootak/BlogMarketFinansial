'use client';

import React, { type FC } from 'react';
import { HiHeart, HiOutlineHeart, HiReply } from 'react-icons/hi';
import { motion } from 'framer-motion';
import convertNumbThousand from '@/utils/convertNumbThousand';
import twFocusClass from '@/utils/twFocusClass';

export interface CommentCardLikeReplyProps {
  className?: string;
  onClickReply: () => void;
  onClickLike: () => void;
  likeCount: number;
  isLiked: boolean;
}

const CommentCardLikeReply: FC<CommentCardLikeReplyProps> = ({
  className = '',
  likeCount,
  isLiked,
  onClickReply,
  onClickLike,
}) => {
  const renderActionBtns = () => {
    return (
      <>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className={`min-w-[68px] flex items-center justify-center rounded-full leading-none px-3 h-8 text-xs ${twFocusClass()} ${
            isLiked
              ? 'text-primary-600 bg-primary-50 dark:bg-primary-900 dark:text-primary-200'
              : 'text-neutral-700 bg-neutral-100 dark:text-neutral-200 dark:bg-neutral-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:text-primary-200 dark:hover:bg-primary-900'
          }`}
          onClick={onClickLike}
          title="پسندیدن"
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.2 }}
          >
            {isLiked ? (
              <HiHeart className="w-5 h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
            ) : (
              <HiOutlineHeart className="w-5 h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
            )}
          </motion.div>
          <span>{convertNumbThousand(likeCount)}</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className={`flex items-center justify-center min-w-[68px] rounded-full text-neutral-600 bg-neutral-100 dark:text-neutral-200 dark:bg-neutral-800 px-3 h-8 hover:bg-secondary-50 hover:text-secondary-600 dark:hover:text-secondary-200 dark:hover:bg-secondary-900 ${twFocusClass()}`}
          title="پاسخ"
          onClick={onClickReply}
        >
          <HiReply className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
          <span className="text-xs leading-none">پاسخ</span>
        </motion.button>
      </>
    );
  };

  return (
    <div
      className={`nc-CommentCardLikeReply flex items-center space-x-2 rtl:space-x-reverse ${className}`}
      data-nc-id="CommentCardLikeReply"
    >
      {renderActionBtns()}
    </div>
  );
};

export default CommentCardLikeReply;
