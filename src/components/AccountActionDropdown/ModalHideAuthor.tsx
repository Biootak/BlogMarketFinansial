'use client';

import ButtonPrimary from '@/components/Button/ButtonPrimary';
import NcModal from '@/components/NcModal/NcModal';
import { type FC, useEffect, useRef } from 'react';

import ButtonThird from '../Button/ButtonThird';

export interface ModalHideAuthorProps {
  auhthor?: { id?: string; displayName?: string };
  show: boolean;
  onCloseModalHideAuthor: () => void;
}

const ModalHideAuthor: FC<ModalHideAuthorProps> = ({
  auhthor = {},
  show,
  onCloseModalHideAuthor,
}) => {
  const textareaRef = useRef(null);

  const handleClickSubmitForm = () => {};

  useEffect(() => {
    if (show) {
      setTimeout(() => {
        const element: HTMLTextAreaElement | null = textareaRef.current;
        if (element) {
          (element as HTMLTextAreaElement).focus();
        }
      }, 400);
    }
  }, [show]);

  const renderContent = () => {
    return (
      <form action="#">
        <h3 className="text-lg font-semibold">Hide stories from {auhthor.displayName}</h3>
        <span className="text-sm">
          We will hide all articles from <strong>{auhthor.displayName}</strong>. You will no longer
          see their articles?
        </span>
        <div className="mt-4 flex gap-3">
          <ButtonPrimary className="!bg-red-500" onClick={handleClickSubmitForm} type="submit">
            Hide this author
          </ButtonPrimary>
          <ButtonThird type="button" onClick={onCloseModalHideAuthor}>
            Cancel
          </ButtonThird>
        </div>
      </form>
    );
  };

  const renderTrigger = () => {
    return null;
  };

  return (
    <NcModal
      isOpenProp={show}
      onCloseModal={onCloseModalHideAuthor}
      contentExtraClass="max-w-screen-sm"
      renderContent={renderContent}
      renderTrigger={renderTrigger}
      modalTitle=""
    />
  );
};

export default ModalHideAuthor;
