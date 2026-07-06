// menu-button-subscript.tsx — Inkwell 2026
'use client';

import React, { memo, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import { Toolbar } from '../../ui/toolbar';
import { Icon } from '../../ui/icon';
import { useActive } from '../hooks/use-active';

interface MenuButtonSubscriptProps {
  editor: Editor;
}

const MenuButtonSubscript: React.FC<MenuButtonSubscriptProps> = ({ editor }) => {
  const isActive = useActive(editor, 'subscript');
  const onClick = useCallback(
    () => editor.chain().focus().toggleSubscript().run(),
    [editor],
  );

  return (
    <Toolbar.Button tooltip="پایین‌نویس" tooltipShortcut={['Mod', 'Shift', 'B']} active={isActive} onClick={onClick}>
      <Icon name="subscript" size={16} />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonSubscript, (p, n) => p.editor === n.editor);
