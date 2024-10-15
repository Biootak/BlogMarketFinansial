'use client';

import React, { type FC } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ModalDeleteCommentProps {
  show: boolean;
  onCloseModalDeleteComment: () => void;
  onConfirmDelete: () => void;
}

const ModalDeleteComment: FC<ModalDeleteCommentProps> = ({
  show,
  onCloseModalDeleteComment,
  onConfirmDelete,
}) => {
  const handleConfirmDelete = () => {
    onConfirmDelete();
    onCloseModalDeleteComment();
  };

  return (
    <Dialog open={show} onOpenChange={onCloseModalDeleteComment}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-neutral-800 rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            حذف نظر
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            آیا مطمئن هستید که می‌خواهید این نظر را حذف کنید؟ این عمل قابل بازگشت نیست.
          </p>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            حذف
          </Button>
          <Button
            variant="outline"
            onClick={onCloseModalDeleteComment}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-100"
          >
            لغو
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalDeleteComment;
