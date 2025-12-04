'use client';

import { useState, type FC } from 'react';
import CommentCard from '@/components/CommentCard/CommentCard';
import type { CommentWithRelationsAndLikes } from '@/types/types';
import { HiChevronDown, HiChatBubbleLeftRight } from 'react-icons/hi2';

export interface SingleCommentListsProps {
  comments: CommentWithRelationsAndLikes[];
}

const SingleCommentLists: FC<SingleCommentListsProps> = ({ comments }) => {
  const [visibleComments, setVisibleComments] = useState(5);

  const showAllComments = () => {
    setVisibleComments(comments.length);
  };

  const renderComments = (parentId: string | null = null, depth: number = 0) => {
    return comments
      .filter((comment) => comment.parentId === parentId)
      .slice(0, visibleComments)
      .map((comment, index) => (
        <li 
          key={comment.id} 
          className={`
            relative
            ${depth > 0 ? 'mr-8 sm:mr-12' : ''}
            opacity-0 animate-[fadeInUp_0.4s_ease-out_forwards]
          `}
          style={{ animationDelay: `${index * 80}ms` }}
        >
          {/* Connector Line for Nested Comments */}
          {depth > 0 && (
            <div className="absolute -right-4 sm:-right-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary-200 via-violet-200 to-transparent dark:from-primary-800 dark:via-violet-800" />
          )}
          <CommentCard comment={comment} />
        </li>
      ));
  };

  const remainingCount = comments.length - visibleComments;

  return (
    <div className="nc-SingleCommentLists">
      <ul className="space-y-6">
        {renderComments()}
      </ul>
      
      {visibleComments < comments.length && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={showAllComments}
            className="
              group relative flex items-center gap-3 px-8 py-4 rounded-2xl
              bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-900
              border border-neutral-200/80 dark:border-neutral-700/80
              shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]
              hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]
              hover:border-primary-300 dark:hover:border-primary-700
              hover:-translate-y-1
              transition-all duration-300 ease-out
              overflow-hidden
            "
          >
            {/* Hover Background */}
            <span className="absolute inset-0 bg-gradient-to-br from-primary-50 to-violet-50 dark:from-primary-950/50 dark:to-violet-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Icon */}
            <span className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow duration-300">
              <HiChatBubbleLeftRight className="w-5 h-5 text-white" />
            </span>
            
            {/* Text */}
            <span className="relative flex flex-col items-start">
              <span className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors duration-300">
                مشاهده تمام نظرات
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                +{remainingCount} نظر دیگر
              </span>
            </span>
            
            {/* Arrow */}
            <HiChevronDown className="relative w-5 h-5 text-neutral-400 group-hover:text-primary-500 group-hover:translate-y-1 transition-all duration-300" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SingleCommentLists;
