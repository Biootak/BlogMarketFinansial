import type React from 'react';
import { memo, useCallback, useState, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { Toolbar } from '../../ui/toolbar';
import { Icon } from '../../ui/icon';
import {
  ImageUploaderWithRef,
  type ImageUploaderRef,
  type ImageUploaderProps,
} from '@/components/ImageUpload/ImageUploader';
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
  const imageUploaderRef = useRef<ImageUploaderRef>(null);

  const handleImageUpload = useCallback(
    (urls: string[]) => {
      if (urls.length > 0) {
        const url = urls[0];
        editor.chain().setImage({ src: url }).focus().run();
        setIsOpen(false); // بستن دیالوگ پس از آپلود موفق
      }
    },
    [editor],
  );

  const handleImageRemove = useCallback((_index: number) => {
    // این تابع برای props های ImageUploader مورد نیاز است، اما نیازی به انجام کاری نداریم
  }, []);

  const handleButtonClick = useCallback(() => {
    setIsOpen(true);
    // اگر نیاز به اجرای متد خاصی در ImageUploader باشد، می‌توانیم از ref استفاده کنیم
    // مثلا: imageUploaderRef.current?.open();
  }, []);

  const imageUploaderProps: ImageUploaderProps = {
    onImageUpload: handleImageUpload,
    onImageRemove: handleImageRemove,
    maxFiles: 1,
    multiple: false,
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Toolbar.Button tooltip="درج تصویر" onClick={handleButtonClick}>
          <Icon name="Image" />
        </Toolbar.Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>آپلود تصویر</DialogTitle>
        </DialogHeader>
        <ImageUploaderWithRef ref={imageUploaderRef} {...imageUploaderProps} />
      </DialogContent>
    </Dialog>
  );
};

export default memo(MenuButtonImage, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
