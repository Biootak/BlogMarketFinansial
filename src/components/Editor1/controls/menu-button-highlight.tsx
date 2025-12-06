import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Editor } from '@tiptap/core';
import React, { useCallback } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import { ColorPicker } from '../components/color-picker';
import { useAttributes } from '../hooks/use-attributes';

type MenuButtonHighlightProps = {
  editor: Editor;
};

const MenuButtonHighlight = ({ editor }: MenuButtonHighlightProps) => {
  const highlightColor = useAttributes(
    editor,
    'highlight',
    { color: undefined },
    (attr) => attr.color,
  );

  const onResetHighlight = useCallback(
    () => editor.chain().focus().unsetHighlight().run(),
    [editor],
  );

  const onHighlightChange = useCallback(
    (color: string) => editor.chain().setHighlight({ color }).run(),
    [editor],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Toolbar.Button tooltip={'Highlight'} active={Boolean(highlightColor)}>
          <Icon name="highlighter" style={{ color: highlightColor }} />
        </Toolbar.Button>
      </PopoverTrigger>

      <PopoverContent align="start" side="top" className="w-auto">
        <ColorPicker
          color={highlightColor}
          onChange={onHighlightChange}
          onClear={onResetHighlight}
        />
      </PopoverContent>
    </Popover>
  );
};

export default MenuButtonHighlight;
