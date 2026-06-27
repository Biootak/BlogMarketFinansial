import type React from 'react';
import { memo, useCallback, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Toolbar } from '../../ui/toolbar';
import { Icon } from '../../ui/icon';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MenuButtonImageProps {
  editor: Editor;
}

export const MenuButtonImage: React.FC<MenuButtonImageProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleImageUpload = useCallback(
    (urls: string[]) => {
      if (urls.length > 0) {
        const url = urls[0];
        editor.chain().setImage({ src: url }).focus().run();
        setIsOpen(false); // Close the dialog after successful upload
      }
    },
    [editor],
  );

  const handleImageRemove = useCallback((_index: number) => {
    // This function is required for ImageUploader props, but we don't need to do anything
  }, []);

  const handleButtonClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Toolbar.Button tooltip="درج تصویر" onClick={handleButtonClick}>
          <Icon name="image" />
        </Toolbar.Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>آپلود تصویر</DialogTitle>
        </DialogHeader>
        <ImageUploader
          onImageUpload={handleImageUpload}
          onImageRemove={handleImageRemove}
          maxFiles={1}
          multiple={false}
          folder="posts"
        />
      </DialogContent>
    </Dialog>
  );
};

export default memo(MenuButtonImage, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
