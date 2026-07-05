'use client';

import React, { forwardRef, useImperativeHandle, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';

export interface ImageUploadDialogRef {
  open: () => void;
  close: () => void;
}

interface ImageUploadDialogProps {
  editor: Editor;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ImageUploadDialog = forwardRef<ImageUploadDialogRef, ImageUploadDialogProps>(
  ({ editor, open: controlledOpen, onOpenChange }, ref) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;
    const setOpen = (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    };

    useImperativeHandle(ref, () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
    }));

    const handleImageUpload = (urls: string[]) => {
      if (urls.length > 0) {
        const url = urls[0];
        editor.chain().focus().setImage({ src: url }).run();
        setOpen(false);
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>آپلود تصویر</DialogTitle>
          </DialogHeader>
          <ImageUploader
            onImageUpload={handleImageUpload}
            onImageRemove={() => {}}
            maxFiles={1}
            multiple={false}
            folder="posts"
          />
        </DialogContent>
      </Dialog>
    );
  }
);

ImageUploadDialog.displayName = 'ImageUploadDialog';

export default ImageUploadDialog;
