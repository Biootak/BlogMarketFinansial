/**
 * menu-button-horizontal-rule.tsx — Inkwell 2026
 * دکمه‌ی خط افقی (Horizontal Rule / <hr>) برای تولبار ثابت.
 * قبلاً فقط در slash menu و فلوتینگ منو در دسترس بود.
 */

import type { Editor } from '@tiptap/core';
import React, { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';

interface MenuButtonHorizontalRuleProps {
  editor: Editor;
}

const MenuButtonHorizontalRule = ({ editor }: MenuButtonHorizontalRuleProps) => {
  const onClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      editor.chain().focus().setHorizontalRule().run();
    },
    [editor],
  );

  return (
    <Toolbar.Button tooltip="خط افقی" tooltipShortcut={['Mod', 'Shift', '-']} onClick={onClick}>
      <Icon name="horizontal-rule" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonHorizontalRule, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
