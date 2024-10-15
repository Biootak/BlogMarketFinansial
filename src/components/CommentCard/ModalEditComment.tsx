'use client';

import type React from 'react';
import { type FC, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { CommentWithRelationsAndLikes } from '@/types/types';

export interface ModalEditCommentProps {
  show: boolean;
  onCloseModalEditComment: () => void;
  comment: CommentWithRelationsAndLikes;
  onEditComment: (newContent: string) => Promise<void>;
}

const ModalEditComment: FC<ModalEditCommentProps> = ({
  show,
  onCloseModalEditComment,
  comment,
  onEditComment,
}) => {
  const [content, setContent] = useState(comment.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (show && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onEditComment(content);
    onCloseModalEditComment();
  };

  return (
    <Dialog open={show} onOpenChange={onCloseModalEditComment}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>ویرایش نظر</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="نظر خود را وارد کنید"
            className="min-h-[100px]"
          />
          <DialogFooter className="mt-4">
            <Button type="submit">ذخیره تغییرات</Button>
            <Button type="button" variant="outline" onClick={onCloseModalEditComment}>
              لغو
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModalEditComment;
