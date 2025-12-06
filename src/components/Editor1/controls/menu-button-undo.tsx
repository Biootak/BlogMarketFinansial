import type { Editor } from '@tiptap/core';
import React, { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';

interface MenuButtonUndoProps {
  editor: Editor;
}

const MenuButtonUndo = ({ editor }: MenuButtonUndoProps) => {
  const onUndo = useCallback(() => editor.chain().focus().undo().run(), [editor]);

  return (
    <Toolbar.Button
      tooltip="Undo"
      tooltipShortcut={['Mod', 'Z']}
      disabled={!editor.can().undo()}
      onClick={onUndo}
    >
      <Icon name="undo-2" />
    </Toolbar.Button>
  );
};

export default MenuButtonUndo;
