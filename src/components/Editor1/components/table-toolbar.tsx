// table-toolbar.tsx — Inkwell 2026
// 2026-07-06: مهاجرت از inline lucide-react به Icon wrapper.
//   - همهٔ آیکون‌ها از یک نقطه می‌آیند
//   - Premium stroke (1.25) یکدست
//   - size=16 در دکمه‌های 28px (با 8px padding)

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
import { CellSelection } from '@tiptap/pm/tables';
import { Icon } from '../../ui/icon';
import { ConfirmDialog } from '@/components/Dashboard/primitives/ConfirmDialog';
import { CellColorPicker } from './cell-color-picker';
import { useDirection } from '@/hooks/useDirection';
import { hexToRgba } from '../constants/color';
import { cn } from '@/lib/utils';

interface TableToolbarProps {
  editor: Editor;
}

const TableToolbar: React.FC<TableToolbarProps> = ({ editor }) => {
  const dir = useDirection('rtl');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const canMerge = useMemo(() => editor.can().mergeCells(), [editor.state.selection]);
  const canSplit = useMemo(() => editor.can().splitCell(), [editor.state.selection]);

  useEffect(() => {
    if (!showColorPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

  const setCellBackgroundColor = useCallback(
    (color: string | null) => {
      const { state } = editor.view;
      const { selection, tr } = state;

      if (selection instanceof CellSelection) {
        selection.forEachCell((node, pos) => {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            backgroundColor: color,
          });
        });
        editor.view.dispatch(tr);
      } else {
        const $pos = state.doc.resolve(selection.from);
        const cell = $pos.node(-1);
        const cellPos = $pos.before(-1);

        if (cell && (cell.type.name === 'tableCell' || cell.type.name === 'tableHeader')) {
          const singleTr = state.tr.setNodeMarkup(cellPos, undefined, {
            ...cell.attrs,
            backgroundColor: color,
          });
          editor.view.dispatch(singleTr);
        }
      }

      setShowColorPicker(false);
    },
    [editor],
  );

  const handleColorSelect = useCallback(
    (color: string | null) => {
      setCellBackgroundColor(color);
    },
    [setCellBackgroundColor],
  );

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top' }}
      shouldShow={({ editor, state }) => {
        const { selection } = state;
        const isCellSelection = selection instanceof CellSelection;
        const { from, to } = selection;
        const hasTextSelection = from !== to && !isCellSelection;
        return editor.isActive('table') && !hasTextSelection;
      }}
      className="flex items-center gap-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200/80 dark:border-gray-700/80 p-1.5 z-[100]"
    >
      <div dir={dir} data-dir={dir} className="flex items-center gap-1">
        {/* Row controls */}
        <div className="flex items-center gap-0.5 px-1 border-s border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            aria-label="افزودن ردیف بالا"
          >
            <Icon name="arrow-up" size={16} rtlAware />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            aria-label="افزودن ردیف پیاین"
          >
            <Icon name="arrow-down" size={16} rtlAware />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
            aria-label="حذف ردیف"
          >
            <Icon name="rows" size={16} />
          </button>
        </div>

        {/* Column controls */}
        <div className="flex items-center gap-0.5 px-1 border-s border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            aria-label="افزودن ستون قبلی"
          >
            <Icon name="arrow-right" size={16} rtlAware />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            aria-label="افزودن ستون بعدی"
          >
            <Icon name="arrow-left" size={16} rtlAware />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
            aria-label="حذف ستون"
          >
            <Icon name="columns" size={16} />
          </button>
        </div>

        {/* Merge / Split cells */}
        <div className="flex items-center gap-0.5 px-1 border-s border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => editor.chain().focus().mergeCells().run()}
            disabled={!canMerge}
            className={cn(
              'p-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none',
              canMerge
                ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
            )}
            aria-label="ادغام سلول‌ها"
            aria-disabled={!canMerge}
          >
            <Icon name="merge" size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().splitCell().run()}
            disabled={!canSplit}
            className={cn(
              'p-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none',
              canSplit
                ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
            )}
            aria-label="تفکیک سلول"
            aria-disabled={!canSplit}
          >
            <Icon name="split" size={16} />
          </button>
        </div>

        {/* Color picker */}
        <div
          className="relative flex items-center gap-0.5 px-1 border-s border-gray-200 dark:border-gray-700"
          ref={colorPickerRef}
        >
          <button
            type="button"
            onClick={() => setShowColorPicker((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            aria-label="رنگ پس‌زمینهٔ سلول"
            aria-expanded={showColorPicker}
            aria-haspopup="dialog"
          >
            <Icon name="palette" size={16} />
          </button>                  {showColorPicker && (
              <div
                className="absolute top-full end-0 mt-2 z-[300]"
                ref={colorPickerRef}
              >
                <CellColorPicker
                  onSelect={handleColorSelect}
                  onClose={() => setShowColorPicker(false)}
                />
              </div>
          )}
        </div>

        {/* Delete table */}
        <div className="flex items-center gap-0.5 px-1">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
            aria-label="حذف جدول"
          >
            <Icon name="trash-2" size={16} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="حذف جدول"
        description="آیا از حذف کامل جدول مطمئن هستید؟ این عمل قابل بازگشت نیست."
        confirmLabel="حذف جدول"
        cancelLabel="انصراف"
        onConfirm={() => {
          editor.chain().focus().deleteTable().run();
          setShowDeleteConfirm(false);
        }}
        variant="danger"
      />
    </BubbleMenu>
  );
};

export default TableToolbar;
