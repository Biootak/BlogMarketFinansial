import type { Editor } from '@tiptap/core';
import React, { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import { useActive } from '../hooks/use-active';

interface MenuButtonOrderedListProps {
  editor: Editor;
}

const MenuButtonOrderedList = ({ editor }: MenuButtonOrderedListProps) => {
  const isOrderedList = useActive(editor, 'orderedList');
  const onOrderedList = useCallback(
    () => editor.chain().focus().toggleOrderedList().run(),
    [editor],
  );

  return (
    <Toolbar.Button
      // 2026-07-05: tooltip اضافه شد (قبلاً اصلاً نداشت).
      tooltip="لیست شماره‌دار"
      tooltipShortcut={['Mod', 'Shift', '7']}
      active={isOrderedList}
      onClick={onOrderedList}
    >
      <Icon name="list-ordered" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonOrderedList, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
