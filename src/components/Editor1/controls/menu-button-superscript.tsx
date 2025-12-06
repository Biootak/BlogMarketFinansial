'use client';

import type { Editor } from '@tiptap/react';
import { Superscript } from 'lucide-react';
import type React from 'react';
import { Toolbar } from '../../ui/toolbar';

interface MenuButtonSuperscriptProps {
  editor: Editor;
}

const MenuButtonSuperscript: React.FC<MenuButtonSuperscriptProps> = ({ editor }) => {
  return (
    <Toolbar.Button
      tooltip="بالانویس"
      active={editor.isActive('superscript')}
      onClick={() => editor.chain().focus().toggleSuperscript().run()}
    >
      <Superscript size={18} />
    </Toolbar.Button>
  );
};

export default MenuButtonSuperscript;
