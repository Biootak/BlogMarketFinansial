import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Editor } from '@tiptap/core';
import { memo, useCallback, useMemo } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';
import { useActive } from '../hooks/use-active';
import { cn } from '../lib/utils';

type MenuSelectHeading = {
  editor: Editor;
};

// 2026-07-05: همهٔ labelها به فارسی ترجمه شدند تا در داشبورد ادیتور
// (که کاربر ایرانی دارد) یکدست باشد. اعداد به ارقام فارسی تبدیل
// شدند تا با سایر جاهای UI هم‌خوانی داشته باشند.
const options = [
  {
    value: 'paragraph',
    label: 'پاراگراف',
    icon: <Icon name="text" className="ms-2 size-4" />,
    className: 'text-base',
  },
  {
    value: 1,
    label: 'سرتیتر ۱',
    icon: <Icon name="heading-1" className="ms-2 size-4" />,
    className: 'font-bold text-xl',
  },
  {
    value: 2,
    label: 'سرتیتر ۲',
    icon: <Icon name="heading-2" className="ms-2 size-4" />,
    className: 'font-bold text-2xl',
  },
  {
    value: 3,
    label: 'سرتیتر ۳',
    icon: <Icon name="heading-3" className="ms-2 size-4" />,
    className: 'font-bold text-xl',
  },
  {
    value: 4,
    label: 'سرتیتر ۴',
    icon: <Icon name="heading-4" className="ms-2 size-4" />,
    className: 'font-bold text-lg',
  },
  {
    value: 5,
    label: 'سرتیتر ۵',
    icon: <Icon name="heading-5" className="ms-2 size-4" />,
    className: 'font-bold text-base',
  },
  {
    value: 6,
    label: 'سرتیتر ۶',
    icon: <Icon name="heading-6" className="ms-2 size-4" />,
    className: 'font-bold text-sm',
  },
] as const;

type OptionValue = (typeof options)[number]['value'];

const MenuSelectHeading = ({ editor }: MenuSelectHeading) => {
  const isH1 = useActive(editor, 'heading', { level: 1 });
  const isH2 = useActive(editor, 'heading', { level: 2 });
  const isH3 = useActive(editor, 'heading', { level: 3 });
  const isH4 = useActive(editor, 'heading', { level: 4 });
  const isH5 = useActive(editor, 'heading', { level: 5 });
  const isH6 = useActive(editor, 'heading', { level: 6 });

  const current = useMemo(() => {
    let key: string | number = 'paragraph';
    if (isH1) key = 1;
    if (isH2) key = 2;
    if (isH3) key = 3;
    if (isH4) key = 4;
    if (isH5) key = 5;
    if (isH6) key = 6;

    return options.find((item) => item.value === key)!;
  }, [isH1, isH2, isH3, isH4, isH5, isH6]);

  const onHeadingSelect = useCallback(
    (level: OptionValue) => {
      if (typeof level === 'number') {
        editor.chain().setHeading({ level }).focus().run();
      } else {
        editor.chain().setParagraph().focus().run();
      }
    },
    [editor],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Toolbar.Button isDropdown={true} className="min-w-[130px] px-2">
          <span className="flex flex-1">
            {current.icon}
            {current.label}
          </span>
        </Toolbar.Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={cn(option.className, 'px-4 flex items-center')}
            onSelect={() => onHeadingSelect(option.value)}
          >
            {option.icon}
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default memo(MenuSelectHeading, (prevProps, nextProps) => {
  return prevProps.editor === nextProps.editor;
});
