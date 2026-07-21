'use client';

import CommentCard from '@/components/CommentCard/CommentCard';
import type { CommentWithRelationsAndLikes } from '@/types/types';
import { type FC, useState } from 'react';
import { HiChatBubbleLeftRight, HiChevronDown } from 'react-icons/hi2';

export interface SingleCommentListsProps {
  comments: CommentWithRelationsAndLikes[];
}

const SingleCommentLists: FC<SingleCommentListsProps> = ({ comments }) => {
  const [visibleComments, setVisibleComments] = useState(5);

  const showAllComments = () => {
    setVisibleComments(comments.length);
  };

  const renderComments = (parentId: string | null = null, depth = 0) => {
    return comments
      .filter((comment) => comment.parentId === parentId)
      .slice(0, visibleComments)
      .map((comment, index) => (
        <li
          key={comment.id}
          className={`
            relative
            ${depth > 0 ? 'me-8 sm:me-12' : ''}
            opacity-0 animate-[fadeInUp_0.4s_ease-out_forwards]
          `}
          style={{ animationDelay: `${index * 80}ms` }}
        >
          {/* Connector Line for Nested Comments */}
          {depth > 0 && (
            <div
              className="absolute -end-4 sm:-end-6 top-0 bottom-0 w-px"
              style={{
                background:
                  'linear-gradient(to bottom, oklch(92% 0.05 165 / 0.8), oklch(58% 0.12 165 / 0.3), transparent)',
              }}
            />
          )}
          <CommentCard comment={comment} />
        </li>
      ));
  };

  const remainingCount = comments.length - visibleComments;

  return (
    <div className="nc-SingleCommentLists">
      <ul className="space-y-6">{renderComments()}</ul>

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
              hover:border-neutral-300 dark:hover:border-neutral-600
              hover:-translate-y-1
              transition-all duration-300 ease-out
              overflow-hidden
            "
          >
            {/* Hover Background */}
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
              style={{
                background:
                  'linear-gradient(135deg, oklch(96% 0.03 165 / 0.5), oklch(92% 0.05 165 / 0.3))',
              }}
            />

            {/* Icon */}
            <span
              className="relative flex items-center justify-center w-10 h-10 rounded-xl shadow-lg transition-shadow duration-300"
              style={{
                background: 'var(--ds-brand-600)',
                boxShadow: '0 4px 16px -4px oklch(52% 0.14 162 / 0.35)',
              }}
            >
              <HiChatBubbleLeftRight className="w-5 h-5 text-white" />
            </span>

            {/* Text */}
            <span className="relative flex flex-col items-start">
              <span className="text-sm font-bold text-neutral-900 dark:text-white transition-colors duration-300">
                مشاهده تمام نظرات
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                +{remainingCount} نظر دیگر
              </span>
            </span>

            {/* Arrow */}
            <HiChevronDown className="relative w-5 h-5 text-neutral-400 group-hover:translate-y-1 transition-all duration-300" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SingleCommentLists;
