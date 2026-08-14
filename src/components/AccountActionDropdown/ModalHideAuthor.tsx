'use client';

import ButtonPrimary from '@/components/Button/ButtonPrimary';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FC } from 'react';
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
  const handleClickSubmitForm = () => {};

  return (
    <Dialog
      open={show}
      onOpenChange={(open) => {
        if (!open) onCloseModalHideAuthor();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>مخفی کردن نوشته‌های {auhthor.displayName}</DialogTitle>
          <DialogDescription>
            همهٔ نوشته‌های <strong>{auhthor.displayName}</strong> مخفی می‌شوند و دیگر آن‌ها را نخواهی
            دید.
          </DialogDescription>
        </DialogHeader>
        <form action="#">
          <DialogFooter>
            <ButtonPrimary className="!bg-red-500" onClick={handleClickSubmitForm} type="submit">
              مخفی کن
            </ButtonPrimary>
            <ButtonThird type="button" onClick={onCloseModalHideAuthor}>
              انصراف
            </ButtonThird>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModalHideAuthor;
