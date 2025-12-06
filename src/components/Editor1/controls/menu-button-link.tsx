import type { Editor } from '@tiptap/core';
import React, { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import isTextSelected from '../lib/editor';

interface MenuButtonLinkProps {
  editor: Editor;
}

export const MenuButtonLink = ({ editor }: MenuButtonLinkProps) => {
  const onLink = useCallback(() => {
    if (!isTextSelected(editor)) return;

    // @ts-ignore
    editor.chain().focus().toggleLink({ class: 'fake_link' }).run();
  }, [editor]);

  return (
    <Toolbar.Button tooltip="Link" onClick={onLink}>
      <Icon name="link-2" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonLink, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
