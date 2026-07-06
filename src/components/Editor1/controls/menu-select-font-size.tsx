// menu-select-font-size.tsx — Inkwell 2026
// 2026-07-06: مهاجرت از inline lucide-react به Icon wrapper.
//   - Premium stroke (1.25) یکدست
//   - سایز هماهنگ با سایر آیکون‌های تولبار (16)؛ داخل dropdown کوچک‌تر
//   - RTL aware برای chevron

'use client';

import React, { memo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icon } from '../../ui/icon';
import { fontSizes } from '../extensions/font-size';

interface MenuSelectFontSizeProps {
  editor: Editor;
}

const MenuSelectFontSize: React.FC<MenuSelectFontSizeProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customSize, setCustomSize] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentFontSize = editor.getAttributes('textStyle').fontSize || '16px';
  const currentSizeNumber = currentFontSize.replace('px', '');

  const handleSizeSelect = (value: string) => {
    if (value === '16px') {
      editor.chain().focus().unsetFontSize().run();
    } else {
      editor.chain().focus().setFontSize(value).run();
    }
    setIsOpen(false);
  };

  const handleCustomSize = () => {
    const size = Number.parseInt(customSize, 10);
    if (Number.isFinite(size) && size >= 8 && size <= 96) {
      editor.chain().focus().setFontSize(`${size}px`).run();
      setCustomSize('');
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSize();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`اندازهٔ فونت — ${currentSizeNumber} پیکسل`}
          className="h-8 px-2.5 flex items-center gap-1.5 text-sm bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded-lg text-primary-600 dark:text-primary-400 transition-colors"
        >
          {/* بجای آیکون، یک «Aa» کوچک می‌گذاریم — حس سایز فونت را
              مستقیم نشان می‌دهد و در نوار 32px شلوغ نمی‌کند. */}
          <span className="font-bold leading-none text-[11px] tracking-tight">Aa</span>
          <span className="min-w-[20px] text-center font-semibold tabular-nums">
            {currentSizeNumber}
          </span>
          <Icon
            name="chevron-down"
            size={12}
            strokeWidth={1.5}
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="number"
              min="8"
              max="96"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="سایز دلخواه"
              aria-label="اندازهٔ سفارشی"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleCustomSize}
              aria-label="تایید اندازه"
              className="px-3 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Icon name="check" size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className="max-h-[250px] overflow-y-auto py-1" role="listbox">
          {fontSizes.map((size) => (
            <button
              key={size.value}
              type="button"
              role="option"
              aria-selected={currentFontSize === size.value}
              onClick={() => handleSizeSelect(size.value)}
              className={`w-full px-3 py-2 text-sm text-right flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                currentFontSize === size.value
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <span style={{ fontSize: `${Math.min(parseInt(size.label, 10), 24)}px` }}>
                {size.label}
              </span>
              {currentFontSize === size.value && (
                <Icon
                  name="check"
                  size={14}
                  strokeWidth={2.5}
                  className="text-primary-500"
                />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default memo(MenuSelectFontSize, (p, n) => p.editor === n.editor);
