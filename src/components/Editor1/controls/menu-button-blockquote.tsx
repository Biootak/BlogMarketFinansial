import type { Editor } from '@tiptap/core';
import React, { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import { useActive } from '../hooks/use-active';

interface MenuButtonQuoteProps {
  editor: Editor;
}

const MenuButtonBlockquote = ({ editor }: MenuButtonQuoteProps) => {
  const isBlockquoteActive = useActive(editor, 'blockquote');
  const onBlockquote = useCallback(() => editor.chain().focus().toggleBlockquote().run(), [editor]);

  return (
    <Toolbar.Button
      tooltip="Blockquote"
      tooltipShortcut={['Mod', 'Shift', 'B']}
      active={isBlockquoteActive}
      onClick={onBlockquote}
    >
      <Icon name="quote" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonBlockquote, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
