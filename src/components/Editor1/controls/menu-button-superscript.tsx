// menu-button-superscript.tsx — Inkwell 2026
'use client';

import type { Editor } from '@tiptap/core';
import type React from 'react';
import { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import { useActive } from '../hooks/use-active';

interface MenuButtonSuperscriptProps {
  editor: Editor;
}

const MenuButtonSuperscript: React.FC<MenuButtonSuperscriptProps> = ({ editor }) => {
  const isActive = useActive(editor, 'superscript');
  const onClick = useCallback(() => editor.chain().focus().toggleSuperscript().run(), [editor]);

  return (
    <Toolbar.Button
      tooltip="بالانویس"
      tooltipShortcut={['Mod', 'Shift', 'P']}
      active={isActive}
      onClick={onClick}
    >
      <Icon name="superscript" size={16} />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonSuperscript, (p, n) => p.editor === n.editor);
