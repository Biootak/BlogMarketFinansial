'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
import { CellSelection } from '@tiptap/pm/tables';
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Merge,
  Split,
  RowsIcon,
  Columns,
  Palette,
  X,
} from 'lucide-react';
import { COLOR_PALETTE, DEFAULT_COLORS, hexToRgba } from '../constants/color';
import { cn } from '@/lib/utils';
// 2026-07-05: dir صریح برای portal tippy.
import { useDirection } from '@/hooks/useDirection';

interface TableToolbarProps {
  editor: Editor;
}

const TableToolbar: React.FC<TableToolbarProps> = ({ editor }) => {
  const dir = useDirection('rtl');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'palette' | 'transparent'>('palette');
  const [opacity, setOpacity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // استفاده از useMemo برای جلوگیری از re-render غیرضروری
  const canMerge = useMemo(() => editor.can().mergeCells(), [editor.state.selection]);
  const canSplit = useMemo(() => editor.can().splitCell(), [editor.state.selection]);

  // Click outside handler
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

  const setCellBackgroundColor = useCallback((color: string | null) => {
    let finalColor = color;
    if (finalColor && opacity < 1) {
      const match = finalColor.match(/^#([0-9A-F]{6})$/i);
      if (match) {
        finalColor = hexToRgba(finalColor, opacity);
      }
    }
    
    const { state } = editor.view;
    const { selection, tr } = state;
    
    if (selection instanceof CellSelection) {
      // برای انتخاب چند سلولی
      selection.forEachCell((node, pos) => {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          backgroundColor: finalColor,
        });
      });
      editor.view.dispatch(tr);
    } else {
      // برای یک سلول
      const $pos = state.doc.resolve(selection.from);
      const cell = $pos.node(-1);
      const cellPos = $pos.before(-1);
      
      if (cell && (cell.type.name === 'tableCell' || cell.type.name === 'tableHeader')) {
        const singleTr = state.tr.setNodeMarkup(cellPos, undefined, {
          ...cell.attrs,
          backgroundColor: finalColor,
        });
        editor.view.dispatch(singleTr);
      }
    }
    
    setShowColorPicker(false);
  }, [editor, opacity]);

  const handleColorSelect = useCallback((color: string) => {
    setSelectedColor(color);
    setCellBackgroundColor(opacity < 1 ? hexToRgba(color, opacity) : color);
  }, [opacity, setCellBackgroundColor]);

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
      className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-1.5 z-[100]"
    >
      <div dir={dir} data-dir={dir} className="flex items-center gap-1">
      {/* Row controls */}
      <div className="flex items-center gap-0.5 px-1 border-s border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="افزودن ردیف بالا"
        >
          <ArrowUp size={16} />
        </button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().addRowAfter().run()} 
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="افزودن ردیف پایین"
        >
          <ArrowDown size={16} />
        </button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().deleteRow().run()} 
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
          aria-label="حذف ردیف"
        >
          <RowsIcon size={16} />
        </button>
      </div>

      {/* Column controls */}
      <div className="flex items-center gap-0.5 px-1 border-s border-gray-200 dark:border-gray-700">
        <button 
          type="button" 
          onClick={() => editor.chain().focus().addColumnBefore().run()} 
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="افزودن ستون راست"
        >
          <ArrowRight size={16} />
        </button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().addColumnAfter().run()} 
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="افزودن ستون چپ"
        >
          <ArrowLeft size={16} />
        </button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().deleteColumn().run()} 
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
          aria-label="حذف ستون"
        >
          <Columns size={16} />
        </button>
      </div>

      {/* Merge/Split controls */}
      <div className="flex items-center gap-0.5 px-1 border-s border-gray-200 dark:border-gray-700">
        <button 
          type="button" 
          onClick={() => editor.chain().focus().mergeCells().run()} 
          disabled={!canMerge} 
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            canMerge 
              ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300' 
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          )}
          aria-label="ادغام سلول‌ها"
          aria-disabled={!canMerge}
        >
          <Merge size={16} />
        </button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().splitCell().run()} 
          disabled={!canSplit} 
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            canSplit 
              ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300' 
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          )}
          aria-label="تفکیک سلول"
          aria-disabled={!canSplit}
        >
          <Split size={16} />
        </button>
      </div>

      {/* Color picker */}
      <div className="relative flex items-center gap-0.5 px-1 border-s border-gray-200 dark:border-gray-700" ref={colorPickerRef}>
        <button 
          type="button" 
          onClick={() => setShowColorPicker(!showColorPicker)} 
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="رنگ پس‌زمینه سلول"
          aria-expanded={showColorPicker}
        >
          <Palette size={16} />
        </button>
        
        {showColorPicker && (
          <div className="absolute top-full end-0 mt-2 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[300] min-w-[260px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">رنگ سلول</span>
              <button 
                type="button" 
                onClick={() => setShowColorPicker(false)} 
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="بستن"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-3 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button 
                type="button" 
                onClick={() => setActiveTab('palette')} 
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  activeTab === 'palette' 
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                پالت رنگ
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab('transparent')} 
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  activeTab === 'transparent' 
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                شفاف
              </button>
            </div>

            {activeTab === 'palette' ? (
              /* Color palette */
              <div className="space-y-1.5">
                {Object.entries(COLOR_PALETTE).slice(0, 5).map(([category, colors]) => (
                  <div key={category} className="flex gap-1">
                    {colors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => handleColorSelect(c.value)}
                        title={c.name}
                        className={cn(
                          'w-6 h-6 rounded-md transition-all hover:scale-110 border',
                          selectedColor === c.value ? 'ring-2 ring-primary-500 ring-offset-1' : '',
                          c.isBrightColor ? 'border-gray-200 dark:border-gray-600' : 'border-transparent'
                        )}
                        style={{ backgroundColor: c.value }}
                        aria-label={c.name}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              /* Opacity slider */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">شفافیت</span>
                  <span className="font-mono text-gray-900 dark:text-white">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="grid grid-cols-5 gap-1.5">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleColorSelect(c.value)}
                      title={c.name}
                      className="w-full h-8 rounded-md transition-all hover:scale-105 border border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: hexToRgba(c.value, opacity) }}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Clear button */}
            <button
              type="button"
              onClick={() => setCellBackgroundColor(null)}
              className="w-full mt-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              حذف رنگ
            </button>
          </div>
        )}
      </div>

      {/* Delete table */}
      <div className="flex items-center gap-0.5 px-1">
        <button 
          type="button" 
          onClick={() => { 
            if (window.confirm('آیا از حذف جدول مطمئن هستید؟')) {
              editor.chain().focus().deleteTable().run(); 
            }
          }} 
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
          aria-label="حذف جدول"
        >
          <Trash2 size={16} />
        </button>
      </div>
      </div>
    </BubbleMenu>
  );
};

export default TableToolbar;
