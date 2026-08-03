'use client';

// 2026-07-05: dir صریح برای portal tippy که slash commands را render می‌کند.
import { useDirection } from '@/hooks/useDirection';
import { Search } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
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
    const dir = useDirection('rtl');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLButtonElement>(null);

    // buildFlatItems returns the same items as groupedItems but as a flat
    // array — used by keyboard nav (up/down/enter) via selectedIndex.
    // The render path uses the optimized itemIndex Map instead.
    const buildFlatItems = useCallback(() => {
      const result: { item: SlashCommandItem; category: string }[] = [];
      const grouped = items.reduce(
        (acc, item) => {
          if (!acc[item.category]) acc[item.category] = [];
          acc[item.category].push(item);
          return acc;
        },
        {} as Record<string, SlashCommandItem[]>,
      );
      for (const [category, categoryItems] of Object.entries(grouped)) {
        for (const item of categoryItems) {
          result.push({ item, category });
        }
      }
      return result;
    }, [items]);

    // Recompute only when items change; keyboard nav reads length from here.
    const flatItemsForNav = buildFlatItems();

    const selectItem = useCallback(
      (index: number) => {
        const entry = flatItemsForNav[index];
        if (entry) command(entry.item);
      },
      [flatItemsForNav, command],
    );

    const upHandler = useCallback(() => {
      setSelectedIndex((prev) => (prev + flatItemsForNav.length - 1) % flatItemsForNav.length);
    }, [flatItemsForNav.length]);

    const downHandler = useCallback(() => {
      setSelectedIndex((prev) => (prev + 1) % flatItemsForNav.length);
    }, [flatItemsForNav.length]);

    const enterHandler = useCallback(() => {
      selectItem(selectedIndex);
    }, [selectItem, selectedIndex]);

    const _tabHandler = useCallback(() => {
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

        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          enterHandler();
          return true;
        }

        if (event.key === 'Escape') {
          return true;
        }

        return false;
      },
    }));

    // Group items by category for rendering
    const groupedItems = items.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      },
      {} as Record<string, SlashCommandItem[]>,
    );

    const categoryLabels: Record<SlashCommandItem['category'], string> = {
      basic: 'پایه',
      list: 'لیست‌ها',
      media: 'رسانه',
      advanced: 'پیشرفته',
    };

    const categoryOrder = ['basic', 'list', 'media', 'advanced'];
    const sortedCategories = Object.keys(groupedItems).sort(
      (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
    );

    // Build two parallel structures ONCE so render is O(1) per item:
    //   flatItems  — sequential list for keyboard nav (up/down/enter)
    //   itemIndex  — Map keyed by `${category}-${item.title}` for O(1) render lookups
    //
    // Previous version called `.find()` inside the category map — O(n) per item,
    // O(n²) total. Now both structures are built in a single O(n) pass.
    const { flatItems, itemIndex } = useMemo(() => {
      const flat: { item: SlashCommandItem; category: string; index: number }[] = [];
      const index = new Map<string, number>();
      for (const category of sortedCategories) {
        const categoryItems = groupedItems[category];
        for (const item of categoryItems) {
          const idx = flat.length;
          flat.push({ item, category, index: idx });
          index.set(`${category}-${item.title}`, idx);
        }
      }
      return { flatItems: flat, itemIndex: index };
    }, [sortedCategories, groupedItems]);

    // selectedIndex is guaranteed in-bounds because upHandler/downHandler modulo
    // the length. For the 0-length case we already return early below.
    const _selectedEntry = flatItems[selectedIndex] ?? null;

    if (items.length === 0) {
      return (
        <div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 text-gray-500 dark:text-gray-400 text-sm text-center w-full max-w-[calc(100vw-2rem)] sm:max-w-[20rem]"
          role="status"
          aria-live="polite"
          dir={dir}
          data-dir={dir}
        >
          <Search className="mx-auto mb-2 h-7 w-7 opacity-60" strokeWidth={1.5} aria-hidden />
          نتیجه‌ای یافت نشد
        </div>
      );
    }

    return (
      <div
        ref={listRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 w-full min-w-[260px] max-w-[calc(100vw-2rem)] sm:max-w-[20rem] max-h-[60vh] sm:max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
        role="listbox"
        aria-label="منوی دستورات"
        aria-activedescendant={`slash-item-${selectedIndex}`}
        dir={dir}
        data-dir={dir}
        tabIndex={0}
      >
        {sortedCategories.map((category) => {
          const categoryItems = groupedItems[category];
          const label = categoryLabels[category as SlashCommandItem['category']] ?? category;
          return (
            <div key={category} role="group" aria-labelledby={`category-${category}`}>
              <div
                id={`category-${category}`}
                className="px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider sticky top-0 bg-white dark:bg-gray-800 z-10"
              >
                {label}
              </div>
              {categoryItems.map((item) => {
                // O(1) lookup via the Map — no scan needed.
                const globalIndex = itemIndex.get(`${category}-${item.title}`) ?? 0;
                const isSelected = globalIndex === selectedIndex;
                const ItemIcon = item.icon;
                return (
                  <button
                    key={`${category}-${item.title}`}
                    id={`slash-item-${globalIndex}`}
                    ref={isSelected ? selectedRef : null}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectItem(globalIndex)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-start transition-all duration-150 ${
                      isSelected
                        ? 'bg-primary-100 dark:bg-primary-900/30 border-s-2 border-primary-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-s-2 border-transparent'
                    }`}
                  >
                    <span
                      className={`w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 transition-all ${
                        isSelected
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                      aria-hidden="true"
                    >
                      <ItemIcon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          isSelected
                            ? 'text-primary-700 dark:text-primary-300'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  },
);

SlashCommandMenu.displayName = 'SlashCommandMenu';

export default SlashCommandMenu;
