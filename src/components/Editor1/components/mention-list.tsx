'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';
import type { MentionUser } from '../extensions/mention';

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) {
          command({ id: item.id, label: item.name });
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
          کاربری یافت نشد
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px] max-h-[250px] overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectItem(index)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-right transition-colors ${
              index === selectedIndex
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center text-sm font-medium text-primary-700 dark:text-primary-200">
              {item.avatar ? (
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                item.name.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                @{item.username}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';

export default MentionList;
