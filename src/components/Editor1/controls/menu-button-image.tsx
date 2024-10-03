import React, { memo, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import { Toolbar } from '../../ui/toolbar';
import { Icon } from '../../ui/icon';
import { ImageUploaderWithRef, type ImageUploaderRef } from '@/components/ImageUpload/ImageUploader';

interface MenuButtonImageProps {
  editor: Editor;
}

export const MenuButtonImage: React.FC<MenuButtonImageProps> = ({ editor }) => {
  const imageUploaderRef = React.useRef<ImageUploaderRef>(null);

  const handleImageUpload = useCallback(
    (urls: string[]) => {
      if (urls.length > 0) {
        const url = urls[0]; // اگر چندین تصویر آپلود شده باشد، اولین تصویر را استفاده می‌کنیم
        editor.chain().setImage({ src: url }).focus().run();
      }
    },
    [editor],
  );

  const handleImageRemove = useCallback((_index: number) => {
    // این تابع برای props های ImageUploader مورد نیاز است، اما نیازی به انجام کاری نداریم
    // زیرا ما فقط از اولین تصویر آپلود شده استفاده می‌کنیم و بلافاصله آن را در ویرایشگر قرار می‌دهیم
  }, []);

  const handleButtonClick = useCallback(() => {
    if (imageUploaderRef.current) {
      imageUploaderRef.current.open();
    }
  }, []);

  return (
    <React.Fragment>
      <Toolbar.Button tooltip="درج تصویر" onClick={handleButtonClick}>
        <Icon name="Image" />
      </Toolbar.Button>
      <ImageUploaderWithRef
        ref={imageUploaderRef}
        onImageUpload={handleImageUpload}
        onImageRemove={handleImageRemove}
        maxFiles={1}
        multiple={false}
      />
    </React.Fragment>
  );
};

export default memo(MenuButtonImage, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
