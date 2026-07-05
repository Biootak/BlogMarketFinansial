import React, { memo, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import { Toolbar } from '../../ui/toolbar';
import { Icon } from '../../ui/icon';

interface MenuButtonUndoProps {
  editor: Editor;
}

const MenuButtonUndo = ({ editor }: MenuButtonUndoProps) => {
  const onUndo = useCallback(() => editor.chain().focus().undo().run(), [editor]);

  return (
    <Toolbar.Button
      // 2026-07-05: ترجمه به فارسی برای consistency با سایر دکمه‌ها.
      tooltip="واگرد"
      tooltipShortcut={['Mod', 'Z']}
      disabled={!editor.can().undo()}
      onClick={onUndo}
    >
      <Icon name="undo-2" />
    </Toolbar.Button>
  );
};

export default MenuButtonUndo;
