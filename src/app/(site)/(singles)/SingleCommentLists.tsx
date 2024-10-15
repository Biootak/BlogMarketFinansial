'use client';

import React, { useState, type FC } from 'react';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import CommentCard from '@/components/CommentCard/CommentCard';
import type { CommentWithRelationsAndLikes } from '@/types/types';

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
      .map((comment) => (
        <li key={comment.id} className={`mt-5 ${depth > 0 ? 'mr-6' : ''}`}>
          <CommentCard comment={comment} />
        </li>
      ));
  };

  return (
    <ul className="nc-SingleCommentLists space-y-5">
      {renderComments()}
      {visibleComments < comments.length && (
        <ButtonPrimary className="dark:bg-primary-700 w-full" onClick={showAllComments}>
          مشاهده تمام نظرات (+{comments.length - visibleComments} نظر)
        </ButtonPrimary>
      )}
    </ul>
  );
};

export default SingleCommentLists;
