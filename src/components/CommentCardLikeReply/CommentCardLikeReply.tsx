import React from 'react';
import { HiReply } from 'react-icons/hi';
import twFocusClass from '@/utils/twFocusClass';

export interface CommentCardReplyProps {
  className?: string;
  onClickReply: () => void;
}

const CommentCardReply = ({ className = '', onClickReply }: CommentCardReplyProps) => {
  return (
    <div
      className={`nc-CommentCardReply flex items-center ${className}`}
      data-nc-id="CommentCardReply"
    >
      <button
        type="button"
        className={`flex items-center justify-center min-w-[68px] rounded-full text-neutral-600 bg-neutral-100 dark:text-neutral-200 dark:bg-neutral-800 px-3 h-8 hover:bg-secondary-50 hover:text-secondary-600 dark:hover:text-secondary-200 dark:hover:bg-secondary-900 ${twFocusClass()}`}
        title="پاسخ"
        onClick={onClickReply}
      >
        <HiReply className="w-4 h-4 ml-1.5 rtl:mr-1.5 rtl:ml-0" />
        <span className="text-xs leading-none">پاسخ</span>
      </button>
    </div>
  );
};

export default CommentCardReply;
