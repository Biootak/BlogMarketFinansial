// menu-button-indent.tsx — Inkwell 2026
// افزایش یک سطح تورفتگی برای پاراگراف/heading فعلی.

import React, { memo, useCallback } from 'react';
import { Toolbar } from '../../ui/toolbar';
import { Icon } from '../../ui/icon';
import type { Editor } from '@tiptap/core';
import { useActive } from '../hooks/use-active';

interface MenuButtonIndentProps {
  editor: Editor;
}

const MenuButtonIndent = ({ editor }: MenuButtonIndentProps) => {
  // داخل list باشیم، StarterKit ساختار لیست را با Tab مدیریت می‌کند.
  const inList = useActive(editor, 'listItem') || useActive(editor, 'taskItem');
  const onClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (inList) return;
      editor.chain().focus().indent().run();
    },
    [editor, inList],
  );

  return (
    <Toolbar.Button
      tooltip="افزایش تورفتگی"
      tooltipShortcut={['Tab']}
      active={false}
      onClick={onClick}
      disabled={inList}
    >
      <Icon name="indent" size={16} rtlAware />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonIndent, (p, n) => p.editor === n.editor);
