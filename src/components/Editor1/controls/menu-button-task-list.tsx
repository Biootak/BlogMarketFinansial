'use client';

import React from 'react';
import type { Editor } from '@tiptap/core';
import { CheckSquare } from 'lucide-react';
import { Toolbar } from '../../ui/toolbar';

interface MenuButtonTaskListProps {
  editor: Editor;
}

const MenuButtonTaskList: React.FC<MenuButtonTaskListProps> = ({ editor }) => {
  return (
    <Toolbar.Button
      tooltip="لیست وظایف"
      active={editor.isActive('taskList')}
      onClick={() => editor.chain().focus().toggleTaskList().run()}
    >
      <CheckSquare size={18} />
    </Toolbar.Button>
  );
};

export default MenuButtonTaskList;
