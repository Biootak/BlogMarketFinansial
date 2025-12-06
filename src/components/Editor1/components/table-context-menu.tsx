'use client';

import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  Merge,
  Minus,
  Palette,
  Split,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { COLOR_PALETTE, hexToRgba } from '../constants/color';

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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [opacity, setOpacity] = useState(1);
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

        if (y + menuHeight > viewportHeight) {
          y = viewportHeight - menuHeight - 10;
        }

        setPosition({ x, y });
        setIsOpen(true);
        setShowColorPicker(false);
      }
    },
    [editor],
  );

  const handleClick = useCallback((event: MouseEvent) => {
    if (menuRef.current?.contains(event.target as Node)) {
      return;
    }
    setIsOpen(false);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showColorPicker) {
          setShowColorPicker(false);
        } else {
          setIsOpen(false);
        }
      }
    },
    [showColorPicker],
  );

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

  const setCellColor = (color: string | null) => {
    if (color && opacity < 1) {
      const match = color.match(/^#([0-9A-F]{6})$/i);
      if (match) {
        color = hexToRgba(color, opacity);
      }
    }
    editor.chain().focus().setCellAttribute('backgroundColor', color).run();
    setIsOpen(false);
  };

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
      className="fixed z-[350] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-150"
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label="منوی جدول"
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
                'w-full flex items-center gap-3 px-3 py-2 text-sm text-right transition-colors',
                item.disabled
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : item.danger
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
              )}
            >
              <span className={item.disabled ? 'opacity-50' : ''} aria-hidden="true">
                {item.icon}
              </span>
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
            <Palette size={14} aria-hidden="true" />
            انتخاب رنگ
          </span>
          <ChevronLeft
            size={14}
            className={cn('transition-transform', showColorPicker && 'rotate-90')}
            aria-hidden="true"
          />
        </button>

        {showColorPicker && (
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
            {/* Color palette - first 4 categories */}
            {Object.entries(COLOR_PALETTE)
              .slice(0, 4)
              .map(([category, colors]) => (
                <div key={category} className="flex gap-1">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() =>
                        setCellColor(opacity < 1 ? hexToRgba(c.value, opacity) : c.value)
                      }
                      title={c.name}
                      aria-label={c.name}
                      className={cn(
                        'w-6 h-6 rounded-md transition-all hover:scale-110 border',
                        c.isBrightColor
                          ? 'border-gray-200 dark:border-gray-600'
                          : 'border-transparent',
                      )}
                      style={{
                        backgroundColor: opacity < 1 ? hexToRgba(c.value, opacity) : c.value,
                      }}
                    />
                  ))}
                </div>
              ))}

            {/* Opacity slider */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400">شفافیت</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(Number.parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                aria-label="تنظیم شفافیت"
              />
            </div>

            {/* Clear color */}
            <button
              type="button"
              onClick={() => setCellColor(null)}
              className="w-full py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              حذف رنگ
            </button>
          </div>
        )}
      </div>

      {/* Delete table button */}
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" role="separator" />
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          if (window.confirm('آیا از حذف جدول مطمئن هستید؟')) {
            editor.chain().focus().deleteTable().run();
            setIsOpen(false);
          }
        }}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-right text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 size={16} aria-hidden="true" />
        <span>حذف کل جدول</span>
      </button>
    </div>
  );
};

export default TableContextMenu;
