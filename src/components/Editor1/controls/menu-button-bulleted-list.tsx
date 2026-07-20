import type { Editor } from '@tiptap/core';
import React, { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import { useActive } from '../hooks/use-active';

interface MenuButtonBulletListProps {
  editor: Editor;
}

const MenuButtonBulletedList = ({ editor }: MenuButtonBulletListProps) => {
  const isBulletList = useActive(editor, 'bulletList');
  const onBulletList = useCallback(() => editor.chain().focus().toggleBulletList().run(), [editor]);

  return (
    <Toolbar.Button
      // 2026-07-05: tooltip اضافه شد (قبلاً اصلاً نداشت).
      tooltip="لیست نشانه‌دار"
      tooltipShortcut={['Mod', 'Shift', '8']}
      active={isBulletList}
      onClick={onBulletList}
    >
      <Icon name="list" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonBulletedList, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
