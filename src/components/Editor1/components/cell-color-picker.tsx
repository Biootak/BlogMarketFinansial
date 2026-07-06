// CellColorPicker.tsx — Inkwell 2026
// Shared color-picker surface for table cell backgrounds.
// Extracted from TableToolbar + TableContextMenu to eliminate duplication.
// Both call sites pass an `onSelect` callback; the picker owns the UI
// state (opacity, active tab, preview) and leaves persistence to the
// parent.

'use client';

import React, { useCallback, useState } from 'react';
import { Icon } from '../../ui/icon';
import { COLOR_PALETTE, DEFAULT_COLORS, hexToRgba } from '../constants/color';
import { cn } from '@/lib/utils';

export interface CellColorPickerProps {
  /** Called when user picks a color. `null` means "clear". */
  onSelect: (color: string | null) => void;
  onClose: () => void;
}

export const CellColorPicker: React.FC<CellColorPickerProps> = ({ onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState<'palette' | 'transparent'>('palette');
  const [opacity, setOpacity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const handleColorSelect = useCallback(
    (color: string) => {
      setSelectedColor(color);
      const finalColor = opacity < 1 ? hexToRgba(color, opacity) : color;
      onSelect(finalColor);
    },
    [opacity, onSelect],
  );

  return (
    <div
      role="dialog"
      aria-label="انتخاب رنگ سلول"
      className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[300] min-w-[260px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          رنگ سلول
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
          aria-label="بستن پنل رنگ"
        >
          <Icon name="x" size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('palette')}
          aria-pressed={activeTab === 'palette'}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none',
            activeTab === 'palette'
              ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400',
          )}
        >
          پالت رنگ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transparent')}
          aria-pressed={activeTab === 'transparent'}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none',
            activeTab === 'transparent'
              ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400',
          )}
        >
          شفاف
        </button>
      </div>

      {/* Palette tab */}
      {activeTab === 'palette' && (
        <div className="space-y-1.5">
          {Object.entries(COLOR_PALETTE)
            .slice(0, 5)
            .map(([category, colors]) => (
              <div key={category} className="flex gap-1">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleColorSelect(c.value)}
                    title={c.name}
                    aria-label={c.name}
                    className={cn(
                      'w-6 h-6 rounded-md transition-all hover:scale-110 border focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none',
                      selectedColor === c.value
                        ? 'ring-2 ring-primary-500 ring-offset-1'
                        : '',
                      c.isBrightColor
                        ? 'border-gray-200 dark:border-gray-600'
                        : 'border-transparent',
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            ))}
        </div>
      )}

      {/* Transparent / opacity tab */}
      {activeTab === 'transparent' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">شفافیت</span>
            <span className="font-mono text-gray-900 dark:text-white">
              {Math.round(opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(Number.parseFloat(e.target.value))}
            aria-label="درصد شفافیت"
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <div className="grid grid-cols-5 gap-1.5">
            {DEFAULT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => handleColorSelect(c.value)}
                title={c.name}
                aria-label={c.name}
                className="w-full h-8 rounded-md transition-all hover:scale-105 border border-gray-200 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                style={{ backgroundColor: hexToRgba(c.value, opacity) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Clear color */}
      <button
        type="button"
        onClick={() => {
          onSelect(null);
          onClose();
        }}
        className="w-full mt-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
      >
        حذف رنگ
      </button>
    </div>
  );
};

export default CellColorPicker;
