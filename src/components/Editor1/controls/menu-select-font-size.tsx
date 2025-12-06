'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Editor } from '@tiptap/react';
import { ALargeSmall, ChevronDown } from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
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
    const size = Number.parseInt(customSize);
    if (size >= 8 && size <= 96) {
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
          className="h-8 px-3 flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
        >
          <ALargeSmall size={16} className="text-gray-500" />
          <span className="min-w-[24px] text-center font-medium">{currentSizeNumber}</span>
          <ChevronDown
            size={14}
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
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleCustomSize}
              className="px-3 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              ✓
            </button>
          </div>
        </div>
        <div className="max-h-[250px] overflow-y-auto py-1">
          {fontSizes.map((size) => (
            <button
              key={size.value}
              type="button"
              onClick={() => handleSizeSelect(size.value)}
              className={`w-full px-3 py-2 text-sm text-right flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                currentFontSize === size.value
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <span style={{ fontSize: `${Math.min(Number.parseInt(size.label), 24)}px` }}>
                {size.label}
              </span>
              {currentFontSize === size.value && <span className="text-primary-500">✓</span>}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MenuSelectFontSize;
