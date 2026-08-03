import type { Editor } from '@tiptap/core';
import { useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';

interface MenuButtonRedoProps {
  editor: Editor;
}

const MenuButtonRedo = ({ editor }: MenuButtonRedoProps) => {
  const onRedo = useCallback(() => editor.chain().focus().redo().run(), [editor]);

  return (
    <Toolbar.Button
      // 2026-07-05: ترجمه به فارسی برای consistency.
      tooltip="از نو"
      tooltipShortcut={['Mod', 'Y']}
      disabled={!editor.can().redo()}
      onClick={onRedo}
    >
      <Icon name="redo-2" />
    </Toolbar.Button>
  );
};

export default MenuButtonRedo;
