import {
  BsCheck,
  BsCheckSquare,
  BsChevronDown,
  BsCode,
  BsTextLeft,
  BsBlockquoteLeft,
  BsTypeBold,
  BsTypeItalic,
  BsTypeUnderline,
} from 'react-icons/bs';
import { AiOutlineOrderedList, AiOutlineUnorderedList } from 'react-icons/ai';
import { TbH1, TbH2, TbH3 } from 'react-icons/tb';
import { EditorBubbleItem, useEditor } from 'novel';

import { Button } from '@/components/ui/button';
import { PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Popover } from '@radix-ui/react-popover';

export type SelectorItem = {
  name: string;
  icon: React.ComponentType;
  command: (editor: ReturnType<typeof useEditor>['editor']) => void;
  isActive: (editor: ReturnType<typeof useEditor>['editor']) => boolean;
};

const items: SelectorItem[] = [
  {
    name: 'متن',
    icon: BsTextLeft,
    command: (editor) => editor?.chain().focus().clearNodes().run(),
    isActive: (editor) =>
      editor
        ? editor.isActive('paragraph') &&
          !editor.isActive('bulletList') &&
          !editor.isActive('orderedList')
        : false,
  },
  {
    name: 'عنوان ۱',
    icon: TbH1,
    command: (editor) => editor?.chain().focus().clearNodes().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => (editor ? editor.isActive('heading', { level: 1 }) : false),
  },
  {
    name: 'عنوان ۲',
    icon: TbH2,
    command: (editor) => editor?.chain().focus().clearNodes().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => (editor ? editor.isActive('heading', { level: 2 }) : false),
  },
  {
    name: 'عنوان ۳',
    icon: TbH3,
    command: (editor) => editor?.chain().focus().clearNodes().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => (editor ? editor.isActive('heading', { level: 3 }) : false),
  },
  {
    name: 'ضخیم',
    icon: BsTypeBold,
    command: (editor) => editor?.chain().focus().toggleBold().run(),
    isActive: (editor) => (editor ? editor.isActive('bold') : false),
  },
  {
    name: 'مورب',
    icon: BsTypeItalic,
    command: (editor) => editor?.chain().focus().toggleItalic().run(),
    isActive: (editor) => (editor ? editor.isActive('italic') : false),
  },
  {
    name: 'زیرخط‌دار',
    icon: BsTypeUnderline,
    command: (editor) => editor?.chain().focus().toggleUnderline().run(),
    isActive: (editor) => (editor ? editor.isActive('underline') : false),
  },
  {
    name: 'لیست کارها',
    icon: BsCheckSquare,
    command: (editor) => editor?.chain().focus().clearNodes().toggleTaskList().run(),
    isActive: (editor) => (editor ? editor.isActive('taskItem') : false),
  },
  {
    name: 'لیست نقطه‌ای',
    icon: AiOutlineUnorderedList,
    command: (editor) => editor?.chain().focus().clearNodes().toggleBulletList().run(),
    isActive: (editor) => (editor ? editor.isActive('bulletList') : false),
  },
  {
    name: 'لیست شماره‌دار',
    icon: AiOutlineOrderedList,
    command: (editor) => editor?.chain().focus().clearNodes().toggleOrderedList().run(),
    isActive: (editor) => (editor ? editor.isActive('orderedList') : false),
  },
  {
    name: 'نقل قول',
    icon: BsBlockquoteLeft,
    command: (editor) => editor?.chain().focus().clearNodes().toggleBlockquote().run(),
    isActive: (editor) => (editor ? editor.isActive('blockquote') : false),
  },
  {
    name: 'کد',
    icon: BsCode,
    command: (editor) => editor?.chain().focus().clearNodes().toggleCodeBlock().run(),
    isActive: (editor) => (editor ? editor.isActive('codeBlock') : false),
  },
];

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NodeSelector = ({ open, onOpenChange }: NodeSelectorProps) => {
  const { editor } = useEditor();
  if (!editor) return null;
  const activeItem = items.filter((item) => item.isActive(editor)).pop() ?? {
    name: 'Multiple',
  };

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        asChild
        className="gap-2 rounded-none border-none hover:bg-accent-100 focus:ring-0"
      >
        <Button size="sm" variant="ghost" className="gap-2 text-neutral-700 hover:text-neutral-900">
          <span className="whitespace-nowrap text-sm">{activeItem.name}</span>
          <BsChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        sideOffset={5}
        align="start"
        className="w-48 p-1 bg-white border border-neutral-200 max-h-[300px] overflow-y-auto"
      >
        {items.map((item) => (
          <EditorBubbleItem
            key={item.name}
            onSelect={(editor) => {
              item.command(editor);
              onOpenChange(false);
            }}
            className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1 text-sm hover:bg-accent-50 text-neutral-700 hover:text-neutral-900"
          >
            <div className="flex items-center space-x-reverse space-x-2">
              <div className="rounded-sm border border-neutral-300 p-1 text-neutral-500">
                <item.icon />
              </div>
              <span>{item.name}</span>
            </div>
            {activeItem.name === item.name && <BsCheck className="h-4 w-4 text-primary-500" />}
          </EditorBubbleItem>
        ))}
      </PopoverContent>
    </Popover>
  );
};
