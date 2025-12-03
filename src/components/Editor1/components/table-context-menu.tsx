'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Minus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Merge,
  Split,
  RowsIcon,
  Columns,
} from 'lucide-react';

interface TableContextMenuProps {
  editor: Editor;
}

interface MenuPosition {
  x: number;
  y: number;
}

const TableContextMenu: React.FC<TableContextMenuProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const tableCell = target.closest('td, th');
      
      if (tableCell && editor.isActive('table')) {
        event.preventDefault();
        
        // Calculate position to keep menu in viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const menuWidth = 220;
        const menuHeight = 350;
        
        let x = event.clientX;
        let y = event.clientY;
        
        // Adjust if menu would go off right edge
        if (x + menuWidth > viewportWidth) {
          x = viewportWidth - menuWidth - 10;
        }
        
        // Adjust if menu would go off bottom edge
        if (y + menuHeight > viewportHeight) {
          y = viewportHeight - menuHeight - 10;
        }
        
        setPosition({ x, y });
        setIsOpen(true);
      }
    },
    [editor]
  );

  const handleClick = useCallback((event: MouseEvent) => {
    // Don't close if clicking inside the menu
    if (menuRef.current && menuRef.current.contains(event.target as Node)) {
      return;
    }
    setIsOpen(false);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleContextMenu, handleClick, handleKeyDown]);

  if (!isOpen) return null;

  interface MenuItem {
    label: string;
    icon: React.ReactNode;
    action: () => boolean;
    danger?: boolean;
    disabled?: boolean;
  }

  interface MenuSection {
    title: string;
    items: MenuItem[];
  }

  const menuSections: MenuSection[] = [
    {
      title: 'ردیف',
      items: [
        {
          label: 'افزودن ردیف بالا',
          icon: <ArrowUp size={16} />,
          action: () => editor.chain().focus().addRowBefore().run(),
        },
        {
          label: 'افزودن ردیف پایین',
          icon: <ArrowDown size={16} />,
          action: () => editor.chain().focus().addRowAfter().run(),
        },
        {
          label: 'حذف ردیف',
          icon: <Minus size={16} />,
          action: () => editor.chain().focus().deleteRow().run(),
          danger: true,
        },
      ],
    },
    {
      title: 'ستون',
      items: [
        {
          label: 'افزودن ستون راست',
          icon: <ArrowRight size={16} />,
          action: () => editor.chain().focus().addColumnBefore().run(),
        },
        {
          label: 'افزودن ستون چپ',
          icon: <ArrowLeft size={16} />,
          action: () => editor.chain().focus().addColumnAfter().run(),
        },
        {
          label: 'حذف ستون',
          icon: <Minus size={16} />,
          action: () => editor.chain().focus().deleteColumn().run(),
          danger: true,
        },
      ],
    },
    {
      title: 'سلول',
      items: [
        {
          label: 'ادغام سلول‌ها',
          icon: <Merge size={16} />,
          action: () => editor.chain().focus().mergeCells().run(),
          disabled: !editor.can().mergeCells(),
        },
        {
          label: 'تفکیک سلول',
          icon: <Split size={16} />,
          action: () => editor.chain().focus().splitCell().run(),
          disabled: !editor.can().splitCell(),
        },
      ],
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-150"
      style={{ left: position.x, top: position.y }}
    >
      {menuSections.map((section, sectionIndex) => (
        <div key={section.title}>
          {sectionIndex > 0 && (
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
          )}
          <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
            {section.title}
          </div>
          {section.items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.action();
                  setIsOpen(false);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-right transition-colors ${
                item.disabled
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : item.danger
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className={item.disabled ? 'opacity-50' : ''}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ))}

      {/* Delete table button */}
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
      <button
        type="button"
        onClick={() => {
          editor.chain().focus().deleteTable().run();
          setIsOpen(false);
        }}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-right text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 size={16} />
        <span>حذف کل جدول</span>
      </button>
    </div>
  );
};

export default TableContextMenu;
