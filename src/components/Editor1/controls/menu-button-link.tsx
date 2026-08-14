import type { Editor } from '@tiptap/core';
import { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import isTextSelected from '../lib/editor';

interface MenuButtonLinkProps {
  editor: Editor;
}

export const MenuButtonLink = ({ editor }: MenuButtonLinkProps) => {
  const onLink = useCallback(() => {
    if (!isTextSelected(editor)) return;

    // toggleLink در تایپ پایه href را الزامی می‌داند؛ اینجا فقط class ست می‌شود
    editor
      .chain()
      .focus()
      .toggleLink({ class: 'fake_link' } as unknown as { href: string; class?: string | null })
      .run();
  }, [editor]);

  return (
    <Toolbar.Button
      // 2026-07-05: ترجمه.
      tooltip="پیوند"
      onClick={onLink}
    >
      <Icon name="link-2" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonLink, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
