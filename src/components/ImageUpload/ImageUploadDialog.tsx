'use client';

import {
  ImageUploader,
  type UploadFolder,
  type UploadedFile,
} from '@/components/ImageUpload/ImageUploader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';

interface ImageUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpload: (urls: string[]) => void;
  onImageRemove: () => void;
  onImageUploadComplete?: (files: UploadedFile[]) => void;
  initialPreview: string;
  title: string;
  folder?: UploadFolder;
}

const ImageUploadDialog: React.FC<ImageUploadDialogProps> = ({
  isOpen,
  onClose,
  onImageUpload,
  onImageRemove,
  onImageUploadComplete,
  initialPreview,
  title,
  folder = 'general',
}) => {
  const [preview, setPreview] = useState(initialPreview);

  const handleImageUpload = (urls: string[]) => {
    if (urls.length > 0) {
      setPreview(urls[0]);
      onImageUpload(urls);
    }
  };

  const handleImageRemove = () => {
    setPreview('');
    onImageRemove();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <ImageUploader
            onImageUpload={handleImageUpload}
            onUploadComplete={onImageUploadComplete}
            onImageRemove={handleImageRemove}
            initialPreviews={preview ? [preview] : []}
            folder={folder}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>بستن</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageUploadDialog;
