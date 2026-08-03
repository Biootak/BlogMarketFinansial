/**
 * menu-button-strike.tsx — Inkwell 2026
 * دکمه‌ی خط‌خورده (Strikethrough) برای تولبار ثابت.
 * قبلاً فقط در bubble menu در دسترس بود.
 */

import type { Editor } from '@tiptap/core';
import { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import { useActive } from '../hooks/use-active';

interface MenuButtonStrikeProps {
  editor: Editor;
}

const MenuButtonStrike = ({ editor }: MenuButtonStrikeProps) => {
  const isActive = useActive(editor, 'strike');
  const onClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      editor.chain().focus().toggleStrike().run();
    },
    [editor],
  );

  return (
    <Toolbar.Button
      tooltip="خط‌خورده"
      tooltipShortcut={['Mod', 'Shift', 'S']}
      active={isActive}
      onClick={onClick}
    >
      <Icon name="strikethrough" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonStrike, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
