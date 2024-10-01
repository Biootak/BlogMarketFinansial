import { FaBold, FaItalic, FaUnderline, FaStrikethrough, FaCode } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EditorBubbleItem, useEditor } from 'novel';
import type { SelectorItem } from './node-selector';

export const TextButtons = () => {
  const { editor } = useEditor();
  if (!editor) return null;
  const items: SelectorItem[] = [
    {
      name: 'bold',
      isActive: (editor) => (editor ? editor.isActive('bold') : false),
      command: (editor) => editor?.chain().focus().toggleBold().run(),
      icon: FaBold,
    },
    {
      name: 'italic',
      isActive: (editor) => (editor ? editor.isActive('italic') : false),
      command: (editor) => editor?.chain().focus().toggleItalic().run(),
      icon: FaItalic,
    },
    {
      name: 'underline',
      isActive: (editor) => (editor ? editor.isActive('underline') : false),
      command: (editor) => editor?.chain().focus().toggleUnderline().run(),
      icon: FaUnderline,
    },
    {
      name: 'strike',
      isActive: (editor) => (editor ? editor.isActive('strike') : false),
      command: (editor) => editor?.chain().focus().toggleStrike().run(),
      icon: FaStrikethrough,
    },
    {
      name: 'code',
      isActive: (editor) => (editor ? editor.isActive('code') : false),
      command: (editor) => editor?.chain().focus().toggleCode().run(),
      icon: FaCode,
    },
  ];
  return (
    <div className="flex">
      {items.map((item) => (
        <EditorBubbleItem
          key={item.name}
          onSelect={(editor) => {
            item.command(editor);
          }}
        >
          <Button size="sm" className="rounded-none" variant="ghost">
            <item.icon
              className={cn('h-4 w-4', {
                'text-primary-500 dark:text-primary-400': item.isActive(editor),
                'text-neutral-700 dark:text-neutral-300': !item.isActive(editor),
              })}
            />
          </Button>
        </EditorBubbleItem>
      ))}
    </div>
  );
};
