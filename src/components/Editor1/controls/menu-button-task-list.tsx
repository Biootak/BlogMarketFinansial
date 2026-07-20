// menu-button-task-list.tsx — Inkwell 2026
'use client';

import type { Editor } from '@tiptap/core';
import type React from 'react';
import { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import { useActive } from '../hooks/use-active';

interface MenuButtonTaskListProps {
  editor: Editor;
}

const MenuButtonTaskList: React.FC<MenuButtonTaskListProps> = ({ editor }) => {
  const isActive = useActive(editor, 'taskList');
  const onClick = useCallback(() => editor.chain().focus().toggleTaskList().run(), [editor]);

  return (
    <Toolbar.Button
      tooltip="لیست وظایف"
      tooltipShortcut={['Mod', 'Shift', '9']}
      active={isActive}
      onClick={onClick}
    >
      <Icon name="task-list" size={16} />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonTaskList, (p, n) => p.editor === n.editor);
