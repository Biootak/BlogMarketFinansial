import React, { memo, useCallback } from 'react';
import { Toolbar } from '../../ui/toolbar';
import { Icon } from '../../ui/icon';
import type { Editor } from '@tiptap/core';
import { useActive } from '../hooks/use-active';

interface MenuButtonItalicProps {
  editor: Editor;
}

const MenuButtonItalic = ({ editor }: MenuButtonItalicProps) => {
  const isItalicActive = useActive(editor, 'italic');
  const onItalic = useCallback(() => editor.chain().focus().toggleItalic().run(), [editor]);

  return (
    <Toolbar.Button
      // 2026-07-05: قبلاً به‌غلط tooltip="Bulleted List" با شورتکات
      // Mod+Shift+8 بود (copy-paste از bulleted-list). متن و کلید
      // میانبر حالا درست است: ایتالیک با Mod+I.
      tooltip="ایتالیک"
      tooltipShortcut={['Mod', 'I']}
      active={isItalicActive}
      onClick={onItalic}
    >
      <Icon name="italic" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonItalic, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
