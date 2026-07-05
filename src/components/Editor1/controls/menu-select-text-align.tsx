import React, { memo, useMemo } from 'react';
import { Toolbar } from '../../ui/toolbar';
import type { Editor } from '@tiptap/core';
import { Icon } from '../../ui/icon';
import { useActive } from '../hooks/use-active';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type MenuSelectTextAlign = {
  editor: Editor;
};

const options = [
  {
    value: 'left',
    label: <Icon name="align-left" />,
    // 2026-07-05: متن فارسی RTL است؛ align-left در CSS به `start`
    // ترجمه می‌شود که در RTL سمت راست (راست‌چین) است.
    tooltip: 'راست‌چین',
  },
  {
    value: 'center',
    label: <Icon name="align-center" />,
    tooltip: 'وسط‌چین',
  },
  {
    value: 'right',
    label: <Icon name="align-right" />,
    // 2026-07-05: align-right در CSS به `end` ترجمه می‌شود که در
    // RTL سمت چپ (چپ‌چین) است.
    tooltip: 'چپ‌چین',
  },
  {
    value: 'justify',
    label: <Icon name="align-justify" />,
    tooltip: 'تراز از دو طرف',
  },
] as const;

const MenuSelectTextAlign = ({ editor }: MenuSelectTextAlign) => {
  const isAlignCenter = useActive(editor, 'textAlign', { textAlign: 'center' });
  const isAlignRight = useActive(editor, 'textAlign', { textAlign: 'right' });
  const isAlignJustify = useActive(editor, 'textAlign', { textAlign: 'justify' });

  const current = useMemo(() => {
    let key = 'left';
    if (isAlignCenter) {
      key = 'center';
    }
    if (isAlignRight) {
      key = 'right';
    }
    if (isAlignJustify) {
      key = 'justify';
    }
    return options.find((item) => item.value === key)!;
  }, [isAlignCenter, isAlignRight, isAlignJustify]);

  const onAlignSelect = (align: string) => {
    return () => editor.chain().focus().setTextAlign(align).run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Toolbar.Button isDropdown={true} className="px-2" tooltip={'تراز متن'}>
          {current.label}
        </Toolbar.Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-fit"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {options.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={onAlignSelect(option.value)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default memo(MenuSelectTextAlign, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
