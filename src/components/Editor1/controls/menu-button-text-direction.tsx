import type { Editor } from '@tiptap/core';
import React, { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';

interface MenuButtonTextDirectionProps {
  editor: Editor;
}

/**
 * MenuButtonTextDirection — Inkwell 2026
 * دکمه‌ی toggle برای RTL/LTR در پاراگراف فعلی.
 * اگر ltr باشد → ltr (active)، اگر rtl یا null باشد → null (غیرفعال).
 */
const MenuButtonTextDirection = ({ editor }: MenuButtonTextDirectionProps) => {
  // تشخیص direction فعلی
  const isLtr =
    editor.isActive('paragraph', { dir: 'ltr' }) || editor.isActive('heading', { dir: 'ltr' });

  const onClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      editor.chain().focus().toggleTextDirection().run();
    },
    [editor],
  );

  return (
    <Toolbar.Button tooltip="تغییر جهت متن (RTL ↔ LTR)" active={isLtr} onClick={onClick}>
      <Icon name="languages" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonTextDirection, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
