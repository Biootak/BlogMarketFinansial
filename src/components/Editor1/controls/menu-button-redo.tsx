import React, { memo, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import { Toolbar } from '../../ui/toolbar';
import { Icon } from '../../ui/icon';

interface MenuButtonRedoProps {
  editor: Editor;
}

const MenuButtonRedo = ({ editor }: MenuButtonRedoProps) => {
  const onRedo = useCallback(() => editor.chain().focus().redo().run(), [editor]);

  return (
    <Toolbar.Button
      tooltip="Redo"
      tooltipShortcut={['Mod', 'Y']}
      disabled={!editor.can().redo()}
      onClick={onRedo}
    >
      <Icon name="redo-2" />
    </Toolbar.Button>
  );
};

export default MenuButtonRedo;
