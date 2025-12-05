'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import type { UploadFolder } from '@/actions/uploadActions';

interface ImageUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpload: (urls: string[]) => void;
  onImageRemove: () => void;
  initialPreview: string;
  title: string;
  folder?: UploadFolder;
}

const ImageUploadDialog: React.FC<ImageUploadDialogProps> = ({
  isOpen,
  onClose,
  onImageUpload,
  onImageRemove,
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
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2 sm:py-4">
          <ImageUploader
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            initialPreviews={preview ? [preview] : []}
            folder={folder}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageUploadDialog;
