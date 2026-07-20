// menu-button-table.tsx — Inkwell 2026
'use client';

import { useDirection } from '@/hooks/useDirection';
import * as Dialog from '@radix-ui/react-dialog';
import type { Editor } from '@tiptap/core';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../../ui/icon';
import { Toolbar } from '../../ui/toolbar';

interface MenuButtonTableProps {
  editor: Editor;
}

const MenuButtonTable: React.FC<MenuButtonTableProps> = ({ editor }) => {
  const dir = useDirection('rtl');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState({ rows: 3, cols: 3 });
  const [hoverSize, setHoverSize] = useState<{ rows: number; cols: number } | null>(null);

  const maxRows = 8;
  const maxCols = 8;

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSize({ rows: 3, cols: 3 });
      setHoverSize(null);
    }
  }, [isOpen]);

  const handleCellHover = useCallback((row: number, col: number) => {
    setHoverSize({ rows: row + 1, cols: col + 1 });
  }, []);

  const handleCellLeave = useCallback(() => {
    setHoverSize(null);
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const newSize = { rows: row + 1, cols: col + 1 };
      setSelectedSize(newSize);
      // Insert immediately on click
      editor
        .chain()
        .focus()
        .insertTable({ rows: newSize.rows, cols: newSize.cols, withHeaderRow: true })
        .run();
      setIsOpen(false);
    },
    [editor],
  );

  const insertTable = useCallback(() => {
    editor
      .chain()
      .focus()
      .insertTable({
        rows: selectedSize.rows,
        cols: selectedSize.cols,
        withHeaderRow: true,
      })
      .run();
    setIsOpen(false);
  }, [editor, selectedSize]);

  const handleQuickInsert = useCallback(
    (rows: number, cols: number) => {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      setIsOpen(false);
    },
    [editor],
  );

  // Display size: hover takes priority, then selected
  const displaySize = hoverSize || selectedSize;

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <Toolbar.Button
          tooltip="جدول"
          tooltipShortcut={['Mod', 'Shift', 'T']}
          active={editor.isActive('table')}
        >
          <Icon name="table" size={16} />
        </Toolbar.Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[90vw] max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
          dir={dir}
          data-dir={dir}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="بستن"
              >
                <Icon name="x" size={18} className="text-gray-500" />
              </button>
            </Dialog.Close>
            <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white">
              درج جدول
            </Dialog.Title>
          </div>

          {/* Quick Insert Buttons */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-start mb-3">انتخاب سریع</p>
            <div className="flex gap-2 justify-end flex-wrap">
              {[
                { rows: 2, cols: 2, label: '۲×۲' },
                { rows: 3, cols: 3, label: '۳×۳' },
                { rows: 4, cols: 4, label: '۴×۴' },
                { rows: 3, cols: 5, label: '۳×۵' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleQuickInsert(preset.rows, preset.cols)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Selector */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-start mb-3">
              یا روی خانه‌ها کلیک کنید
            </p>
            <div className="flex justify-center" onMouseLeave={handleCellLeave}>
              <div className="inline-grid gap-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                {Array.from({ length: maxRows }).map((_, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1">
                    {Array.from({ length: maxCols }).map((_, colIndex) => {
                      const isInDisplayRange =
                        rowIndex < displaySize.rows && colIndex < displaySize.cols;

                      return (
                        <button
                          key={colIndex}
                          type="button"
                          onMouseEnter={() => handleCellHover(rowIndex, colIndex)}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          aria-label={`${rowIndex + 1} × ${colIndex + 1}`}
                          className={`w-6 h-6 rounded border-2 transition-all duration-100 ${
                            isInDisplayRange
                              ? 'bg-primary-500 border-primary-600'
                              : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-center mt-3 text-base font-bold text-primary-600 dark:text-primary-400">
              {displaySize.rows} × {displaySize.cols}
            </p>
          </div>

          {/* Insert Button */}
          <button
            type="button"
            onClick={insertTable}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-medium text-base shadow-lg shadow-primary-500/25"
          >
            درج جدول {selectedSize.rows} × {selectedSize.cols}
          </button>

          {/* Help text */}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
            نکته: برای ویرایش جدول، راست کلیک کنید
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default MenuButtonTable;
