'use client';

import { useDirection } from '@/hooks/useDirection';
import Image from 'next/image';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { MentionUser } from '../extensions/mention';

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(({ items, command }, ref) => {
  const dir = useDirection('rtl');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.name });
      }
    },
    [items, command],
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

  // Scroll selected item into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

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
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 text-gray-500 dark:text-gray-400 text-sm"
        role="status"
        aria-live="polite"
        dir={dir}
        data-dir={dir}
      >
        کاربری یافت نشد
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px] max-h-[250px] overflow-y-auto"
      role="listbox"
      aria-label="لیست کاربران"
      aria-activedescendant={items[selectedIndex]?.id}
      dir={dir}
      data-dir={dir}
      tabIndex={0}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          id={item.id}
          ref={index === selectedIndex ? selectedRef : null}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          onClick={() => selectItem(index)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-start transition-colors ${
            index === selectedIndex
              ? 'bg-primary-100 dark:bg-primary-900/30'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center text-sm font-medium text-primary-700 dark:text-primary-200 flex-shrink-0">
            {item.avatar ? (
              <Image
                unoptimized
                src={item.avatar}
                alt={item.name}
                width={32}
                height={32}
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              item.name.charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              @{item.username}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';

export default MentionList;
