'use client';

import React, { type FC, useEffect, useRef } from 'react';
import NcModal from '@/components/NcModal/NcModal';
import SingleCommentForm from '@/app/(site)/(singles)/SingleCommentForm';
import type { CommentWithRelationsAndLikes } from '@/types/types';

export interface ModalEditCommentProps {
  show: boolean;
  onCloseModalEditComment: () => void;
  comment: CommentWithRelationsAndLikes;
}

const ModalEditComment: FC<ModalEditCommentProps> = ({
  show,
  onCloseModalEditComment,
  comment,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (show) {
      setTimeout(() => {
        const element = textareaRef.current;
        if (element) {
          element.focus();
          element.setSelectionRange(element.value.length, element.value.length);
        }
      }, 400);
    }
  }, [show]);

  const renderContent = () => {
    return (
      <SingleCommentForm
        className="mt-0"
        onClickCancel={onCloseModalEditComment}
        onClickSubmit={onCloseModalEditComment}
        textareaRef={textareaRef}
        postId={comment.postId}
      />
    );
  };

  const renderTrigger = () => {
    return null;
  };

  return (
    <NcModal
      isOpenProp={show}
      onCloseModal={onCloseModalEditComment}
      contentExtraClass="max-w-screen-md"
      renderContent={renderContent}
      renderTrigger={renderTrigger}
      modalTitle="Editing comment"
    />
  );
};

export default ModalEditComment;
