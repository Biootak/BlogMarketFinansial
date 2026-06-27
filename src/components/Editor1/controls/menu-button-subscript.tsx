'use client';

import React from 'react';
import type { Editor } from '@tiptap/react';
import { Subscript } from 'lucide-react';
import { Toolbar } from '../../ui/toolbar';

interface MenuButtonSubscriptProps {
  editor: Editor;
}

const MenuButtonSubscript: React.FC<MenuButtonSubscriptProps> = ({ editor }) => {
  return (
    <Toolbar.Button
      tooltip="پایین‌نویس"
      active={editor.isActive('subscript')}
      onClick={() => editor.chain().focus().toggleSubscript().run()}
    >
      <Subscript size={18} />
    </Toolbar.Button>
  );
};

export default MenuButtonSubscript;
