// menu-button-outdent.tsx — Inkwell 2026
// کاهش یک سطح تورفتگی برای پاراگراف/heading فعلی.

import React, { memo, useCallback } from 'react';
import { Toolbar } from '../../ui/toolbar';
import { Icon } from '../../ui/icon';
import type { Editor } from '@tiptap/core';
import { useActive } from '../hooks/use-active';

interface MenuButtonOutdentProps {
  editor: Editor;
}

const MenuButtonOutdent = ({ editor }: MenuButtonOutdentProps) => {
  // داخل list باشیم، StarterKit ساختار لیست را با Shift+Tab مدیریت می‌کند.
  const inList = useActive(editor, 'listItem') || useActive(editor, 'taskItem');
  const onClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (inList) return;
      editor.chain().focus().outdent().run();
    },
    [editor, inList],
  );

  return (
    <Toolbar.Button
      tooltip="کاهش تورفتگی"
      tooltipShortcut={['Shift', 'Tab']}
      active={false}
      onClick={onClick}
      disabled={inList}
    >
      <Icon name="outdent" size={16} rtlAware />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonOutdent, (p, n) => p.editor === n.editor);
