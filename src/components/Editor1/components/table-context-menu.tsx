'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { Icon } from '../../ui/icon';
import { ConfirmDialog } from '@/components/Dashboard/primitives/ConfirmDialog';
import { CellColorPicker } from './cell-color-picker';
import { cn } from '@/lib/utils';
// 2026-07-06: dir صریح برای منویی که با fixed positioning روی body سوار می‌شود.
import { useDirection } from '@/hooks/useDirection';

interface TableContextMenuProps {
  editor: Editor;
}

interface MenuPosition {
  x: number;
  y: number;
}

const TableContextMenu: React.FC<TableContextMenuProps> = ({ editor }) => {
  const dir = useDirection('rtl');
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const tableCell = target.closest('td, th');
      
      if (tableCell && editor.isActive('table')) {
        event.preventDefault();
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const menuWidth = 240;
        const menuHeight = 400;
        
        let x = event.clientX;
        let y = event.clientY;

        if (x + menuWidth > viewportWidth) {
          x = viewportWidth - menuWidth - 10;
        }
        if (x < 10) {
          x = 10;
        }
        if (y + menuHeight > viewportHeight) {
          y = viewportHeight - menuHeight - 10;
        }
        if (y < 10) {
          y = 10;
        }

        setPosition({ x, y });
        setIsOpen(true);
        setShowColorPicker(false);
      }
    },
    [editor]
  );

  const handleClick = useCallback((event: MouseEvent) => {
    if (menuRef.current && menuRef.current.contains(event.target as Node)) {
      return;
    }
    setIsOpen(false);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (showColorPicker) {
        setShowColorPicker(false);
      } else {
        setIsOpen(false);
      }
    }
  }, [showColorPicker]);

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

  const setCellColor = useCallback(
    (color: string | null) => {
      editor.chain().focus().setCellAttribute('backgroundColor', color).run();
      setIsOpen(false);
    },
    [editor],
  );

  const handleDeleteTable = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteTable = useCallback(() => {
    editor.chain().focus().deleteTable().run();
    setShowDeleteConfirm(false);
    setIsOpen(false);
  }, [editor]);

  if (!isOpen) return null;

  interface MenuItem {
    label: string;
    icon: React.ReactNode;
    action: () => boolean | void;
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
          icon: <Icon name="arrow-up" size={16} rtlAware />,
          action: () => editor.chain().focus().addRowBefore().run(),
        },
        {
          label: 'افزودن ردیف پایین',
          icon: <Icon name="arrow-down" size={16} rtlAware />,
          action: () => editor.chain().focus().addRowAfter().run(),
        },
        {
          label: 'حذف ردیف',
          icon: <Icon name="minus" size={16} />,
          action: () => editor.chain().focus().deleteRow().run(),
          danger: true,
        },
      ],
    },
    {
      title: 'ستون',
      items: [
        {
          // 2026-07-06: در RTL «افزودن ستون سمت راست» یعنی همان addColumnBefore
          // که در RTL ستون سمت راست بصری را اضافه می‌کند. اما کاربر RTL
          // «راست» را سمت راست بصری می‌بیند. برچسب‌ها را منطقی (logical)
          // می‌کنیم: «قبلی/بعدی» به‌جای «راست/چپ».
          label: 'افزودن ستون قبلی',
          icon: <Icon name="arrow-right" size={16} rtlAware />,
          action: () => editor.chain().focus().addColumnBefore().run(),
        },
        {
          label: 'افزودن ستون بعدی',
          icon: <Icon name="arrow-left" size={16} rtlAware />,
          action: () => editor.chain().focus().addColumnAfter().run(),
        },
        {
          label: 'حذف ستون',
          icon: <Icon name="columns" size={16} />,
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
          icon: <Icon name="merge" size={16} />,
          action: () => editor.chain().focus().mergeCells().run(),
          disabled: !editor.can().mergeCells(),
        },
        {
          label: 'تفکیک سلول',
          icon: <Icon name="split" size={16} />,
          action: () => editor.chain().focus().splitCell().run(),
          disabled: !editor.can().splitCell(),
        },
      ],
    },
  ];

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-[350] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-150"
        style={{ left: position.x, top: position.y }}
        role="menu"
        aria-label="منوی جدول"
        dir={dir}
        data-dir={dir}
      >
        {menuSections.map((section, sectionIndex) => (
          <div key={section.title} role="group" aria-labelledby={`section-${section.title}`}>
            {sectionIndex > 0 && (
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" role="separator" />
            )}
            <div 
              id={`section-${section.title}`}
              className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase"
            >
              {section.title}
            </div>
            {section.items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                aria-disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.action();
                    setIsOpen(false);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm text-start transition-colors",
                  item.disabled
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : item.danger
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <span className={item.disabled ? 'opacity-50' : ''} aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}

        {/* Cell color section */}
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" role="separator" />
        <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
          رنگ سلول
        </div>
        
        <div className="px-2 py-1">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            aria-expanded={showColorPicker}
            className="w-full flex items-center justify-between px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name="palette" size={14} aria-hidden="true" />
              انتخاب رنگ
            </span>
            <Icon 
              name="chevron-down"
              size={14} 
              className={cn("transition-transform", showColorPicker && "rotate-180")} 
              aria-hidden="true"
            />
          </button>
          
          {showColorPicker && (
            <div className="mt-2">
              <CellColorPicker onSelect={setCellColor} onClose={() => setShowColorPicker(false)} />
            </div>
          )}
        </div>

        {/* Delete table button */}
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" role="separator" />
        <button
          type="button"
          role="menuitem"
          onClick={handleDeleteTable}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Icon name="trash-2" size={16} aria-hidden="true" />
          <span>حذف کل جدول</span>
        </button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="حذف جدول"
        description="آیا از حذف کامل جدول مطمئن هستید؟ این عمل قابل بازگشت نیست."
        confirmLabel="حذف جدول"
        cancelLabel="انصراف"
        onConfirm={confirmDeleteTable}
        variant="danger"
      />
    </>
  );
};

export default TableContextMenu;
