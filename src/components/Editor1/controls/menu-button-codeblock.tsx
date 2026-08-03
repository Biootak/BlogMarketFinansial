import type { Editor } from '@tiptap/core';

import { memo } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import { useActive } from '../hooks/use-active';

interface MenuButtonCodeBlockProps {
  editor: Editor;
}

const MenuButtonCodeBlock = ({ editor }: MenuButtonCodeBlockProps) => {
  const isCodeBlockActive = useActive(editor, 'codeBlock');
  const onCodeBlock = () => editor.chain().focus().toggleCodeBlock().run();

  return (
    <Toolbar.Button
      // 2026-07-06: شورتکات Mod+Shift+C (C = Code) — چون Mod+E در
      // keyboard-shortcuts برای `toggleCode` (inline code) رزرو شده است.
      // بلوک کد نیاز به شورتکات متفاوت دارد. ProseMirror خودش
      // Mod+Alt+C را هم برای codeBlock به صورت پیش‌فرض دارد.
      tooltip="بلوک کد"
      tooltipShortcut={['Mod', 'Shift', 'C']}
      active={isCodeBlockActive}
      onClick={onCodeBlock}
    >
      <Icon name="code" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonCodeBlock, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
