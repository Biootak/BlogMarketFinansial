'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';
import type { SlashCommandItem } from '../extensions/slash-commands';

export interface SlashCommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) {
          command(item);
        }
      },
      [items, command]
    );

    const upHandler = useCallback(() => {
      setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
    }, [items.length]);

    const downHandler = useCallback(() => {
      setSelectedIndex((prev) => (prev + 1) % items.length);
    }, [items.length]);

    const enterHandler = useCallback(() => {
      selectItem(selectedIndex);
    }, [selectItem, selectedIndex]);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }

        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }

        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 text-gray-500 dark:text-gray-400 text-sm">
          نتیجه‌ای یافت نشد
        </div>
      );
    }

    // Group items by category
    const groupedItems = items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, SlashCommandItem[]>);

    const categoryLabels: Record<string, string> = {
      basic: 'پایه',
      list: 'لیست‌ها',
      media: 'رسانه',
      advanced: 'پیشرفته',
    };

    let globalIndex = 0;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[220px] max-h-[300px] overflow-y-auto">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category}>
            <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              {categoryLabels[category] || category}
            </div>
            {categoryItems.map((item) => {
              const currentIndex = globalIndex++;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => selectItem(currentIndex)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-right transition-colors ${
                    currentIndex === selectedIndex
                      ? 'bg-primary-100 dark:bg-primary-900/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded text-lg">
                    {item.icon}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
);

SlashCommandMenu.displayName = 'SlashCommandMenu';

export default SlashCommandMenu;
