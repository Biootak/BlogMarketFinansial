import type { Editor } from '@tiptap/core';
import React, { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import { useActive } from '../hooks/use-active';

interface MenuButtonUnderlineProps {
  editor: Editor;
}

const MenuButtonUnderline = ({ editor }: MenuButtonUnderlineProps) => {
  const isUnderlineActive = useActive(editor, 'underline');
  const onUnderline = useCallback(() => editor.chain().focus().toggleUnderline().run(), [editor]);

  return (
    <Toolbar.Button
      tooltip="Underline"
      tooltipShortcut={['Mod', 'U']}
      active={isUnderlineActive}
      onClick={onUnderline}
    >
      <Icon name="underline" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonUnderline, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
