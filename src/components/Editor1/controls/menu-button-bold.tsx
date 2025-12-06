import type { Editor } from '@tiptap/core';
import React, { memo, useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import { useActive } from '../hooks/use-active';

interface MenuButtonBoldProps {
  editor: Editor;
}

const MenuButtonBold = ({ editor }: MenuButtonBoldProps) => {
  const isBoldActive = useActive(editor, 'bold');
  const onBold = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      editor.chain().focus().toggleBold().run();
    },
    [editor],
  );

  return (
    <Toolbar.Button
      tooltip="Bold"
      tooltipShortcut={['Mod', 'B']}
      active={isBoldActive}
      onClick={onBold}
    >
      <Icon name="bold" />
    </Toolbar.Button>
  );
};

export default memo(MenuButtonBold, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
