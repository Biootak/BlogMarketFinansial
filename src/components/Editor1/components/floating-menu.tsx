'use client';

import React, { useState } from 'react';
import { FloatingMenu as TiptapFloatingMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { Plus, Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code, Table, Minus } from 'lucide-react';

interface FloatingMenuProps {
  editor: Editor;
}

const FloatingMenuComponent: React.FC<FloatingMenuProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      icon: <Type size={16} />,
      label: 'متن',
      action: () => editor.chain().focus().setParagraph().run(),
    },
    {
      icon: <Heading1 size={16} />,
      label: 'عنوان ۱',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      icon: <Heading2 size={16} />,
      label: 'عنوان ۲',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: <Heading3 size={16} />,
      label: 'عنوان ۳',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: <List size={16} />,
      label: 'لیست نقطه‌ای',
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: <ListOrdered size={16} />,
      label: 'لیست شماره‌ای',
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: <CheckSquare size={16} />,
      label: 'لیست وظایف',
      action: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      icon: <Quote size={16} />,
      label: 'نقل قول',
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: <Code size={16} />,
      label: 'کد',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      icon: <Table size={16} />,
      label: 'جدول',
      action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      icon: <Minus size={16} />,
      label: 'خط جداکننده',
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  return (
    <TiptapFloatingMenu
      editor={editor}
      tippyOptions={{ duration: 100 }}
      shouldShow={({ state }) => {
        const { $from } = state.selection;
        const currentLineText = $from.nodeBefore?.textContent || '';
        return currentLineText === '' && $from.parent.content.size === 0;
      }}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <Plus size={18} className={`transition-transform ${isOpen ? 'rotate-45' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-0 right-10 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[180px] z-50">
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.action();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-right hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </TiptapFloatingMenu>
  );
};

export default FloatingMenuComponent;
