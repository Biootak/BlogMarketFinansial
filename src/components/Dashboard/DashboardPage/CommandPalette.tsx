'use client';

/**
 * CommandPalette — ⌘K command palette for the dashboard.
 *
 * Linear/Vercel signature feature. Opens with:
 *   • macOS: ⌘ + K  (or Ctrl + K on Windows/Linux)
 *   • The floating trigger button in the corner
 *   • Programmatic: window.dispatchEvent(new CustomEvent('cmd-palette:open'))
 *
 * The palette exposes:
 *   • Quick navigation (every sidebar item)
 *   • Quick actions (new post, view reports, …)
 *   • Real-time fuzzy search across labels and Persian synonyms
 *
 * Accessibility:
 *   • role="dialog" with aria-modal="true"
 *   • aria-labelledby points at the title (sr-only)
 *   • focus-trap: input is autofocused on open; Escape closes
 *   • Esc + click-outside + ⌘K toggle
 *   • All actions are real <button>s with focus rings
 */

import { AnimatePresence, motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineChartBarSquare,
  HiOutlineClipboardDocumentCheck,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCommandLine,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineMagnifyingGlass,
  HiOutlineMegaphone,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
  HiOutlineUserCircle,
  HiOutlineUsers,
} from 'react-icons/hi2';

export type CommandActionRole = 'OWNER' | 'ADMIN' | 'AUTHOR';

interface CommandPaletteProps {
  role: CommandActionRole;
}

interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  href: string;
  shortcut?: string;
  /** Optional Persian synonym(s) for search */
  keywords?: string[];
}

const ALL_ITEMS: CommandItem[] = [
  {
    id: 'home',
    label: 'داشبورد',
    group: 'پیمایش',
    icon: <HiOutlineHome className="w-4 h-4" />,
    href: '/dashboard',
    shortcut: 'G H',
    keywords: ['خانه', 'صفحه اصلی'],
  },
  {
    id: 'new-post',
    label: 'نوشتن پست جدید',
    group: 'اقدام‌ها',
    icon: <HiOutlinePencilSquare className="w-4 h-4" />,
    href: '/dashboard/posts/create',
    shortcut: 'C',
    keywords: ['ایجاد', 'مطلب', 'نوشتن', 'پست جدید'],
  },
  {
    id: 'posts',
    label: 'پست‌ها',
    group: 'پیمایش',
    icon: <HiOutlineDocumentText className="w-4 h-4" />,
    href: '/dashboard/posts',
    shortcut: 'G P',
    keywords: ['مقالات', 'نوشته'],
  },
  {
    id: 'categories',
    label: 'دسته‌بندی‌ها',
    group: 'پیمایش',
    icon: <HiOutlineSquares2X2 className="w-4 h-4" />,
    href: '/dashboard/categories',
    keywords: ['دسته', 'تاکسونومی'],
  },
  {
    id: 'ads',
    label: 'تبلیغات',
    group: 'پیمایش',
    icon: <HiOutlineMegaphone className="w-4 h-4" />,
    href: '/dashboard/advertisements',
    keywords: ['بنر', 'ad'],
  },
  {
    id: 'header-ad',
    label: 'تبلیغ بالای هدر',
    group: 'پیمایش',
    icon: <HiOutlineMegaphone className="w-4 h-4" />,
    href: '/dashboard/header-ad',
  },
  {
    id: 'service-requests',
    label: 'درخواست‌های خدمات',
    group: 'پیمایش',
    icon: <HiOutlineClipboardDocumentList className="w-4 h-4" />,
    href: '/dashboard/service-requests',
    shortcut: 'G V',
    keywords: ['سفارش', 'خدمات'],
  },
  {
    id: 'exchange-rates',
    label: 'نرخ ارزها (تکی)',
    group: 'پیمایش',
    icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
    href: '/dashboard/exchange-rates',
    keywords: ['دلار', 'یورو', 'طلا', 'ارز', 'تومان'],
  },
  {
    id: 'rate-lists',
    label: 'نرخ لیستی',
    group: 'پیمایش',
    icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
    href: '/dashboard/rate-lists',
  },
  {
    id: 'reports',
    label: 'گزارش‌ها',
    group: 'پیمایش',
    icon: <HiOutlineChartBarSquare className="w-4 h-4" />,
    href: '/dashboard/reports',
    shortcut: 'G R',
    keywords: ['لاگ', 'سیستم'],
  },
  {
    id: 'users',
    label: 'کاربران',
    group: 'پیمایش',
    icon: <HiOutlineUsers className="w-4 h-4" />,
    href: '/dashboard/users',
    keywords: ['ادمین', 'نویسنده'],
  },
  {
    id: 'settings',
    label: 'تنظیمات سیستم',
    group: 'پیمایش',
    icon: <HiOutlineCog6Tooth className="w-4 h-4" />,
    href: '/dashboard/settings',
    keywords: ['پیکربندی', 'کانفیگ'],
  },
  {
    id: 'edit-profile',
    label: 'ویرایش پروفایل',
    group: 'اقدام‌ها',
    icon: <HiOutlineUserCircle className="w-4 h-4" />,
    href: '/dashboard/edit-profile',
    keywords: ['حساب', 'پروفایل'],
  },
  {
    id: 'analytics-traffic',
    label: 'آمار بازدید',
    group: 'اقدام‌ها',
    icon: <HiOutlineChartBar className="w-4 h-4" />,
    href: '/dashboard?view=traffic',
    keywords: ['ترافیک', 'بازدید', 'نمودار'],
  },
  {
    id: 'analytics-calendar',
    label: 'تقویم انتشار',
    group: 'اقدام‌ها',
    icon: <HiOutlineCalendarDays className="w-4 h-4" />,
    href: '/dashboard?view=calendar',
    keywords: ['تقویم', 'تاریخ'],
  },
  {
    id: 'system-status',
    label: 'گزارش سلامت سیستم',
    group: 'اقدام‌ها',
    icon: <HiOutlineClipboardDocumentCheck className="w-4 h-4" />,
    href: '/dashboard/reports?tab=system',
  },
];

const ROLE_ALLOWED: Record<CommandActionRole, string[] | 'all'> = {
  OWNER: 'all',
  ADMIN: [
    'home',
    'new-post',
    'posts',
    'categories',
    'ads',
    'header-ad',
    'service-requests',
    'exchange-rates',
    'rate-lists',
    'reports',
    'users',
    'edit-profile',
    'analytics-traffic',
    'analytics-calendar',
  ],
  AUTHOR: [
    'home',
    'new-post',
    'posts',
    'categories',
    'edit-profile',
    'analytics-traffic',
    'analytics-calendar',
  ],
};

function fuzzyMatch(query: string, hay: string[]): number {
  if (!query) return 1;
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  for (const h of hay) {
    const t = h.toLowerCase();
    if (t === q) return 100;
    if (t.startsWith(q)) return 60;
    if (t.includes(q)) return 30;
  }
  // token match
  const tokens = q.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const t of tokens) {
    for (const h of hay) {
      if (h.toLowerCase().includes(t)) {
        score += 10;
      }
    }
  }
  return score;
}

export default function CommandPalette({ role }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const allowed = useMemo(
    () =>
      ROLE_ALLOWED[role] === 'all'
        ? ALL_ITEMS
        : ALL_ITEMS.filter((i) => (ROLE_ALLOWED[role] as string[]).includes(i.id)),
    [role],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return allowed;
    return allowed
      .map((item) => {
        const hay = [item.label, item.group, ...(item.keywords ?? []), item.href];
        return { item, score: fuzzyMatch(q, hay) };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  }, [query, allowed]);

  const groupedResults = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const it of results) {
      const list = map.get(it.group) ?? [];
      list.push(it);
      map.set(it.group, list);
    }
    return Array.from(map.entries());
  }, [results]);

  const flatResults = useMemo(() => results, [results]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const run = useCallback(
    (item: CommandItem) => {
      close();
      router.push(item.href);
    },
    [close, router],
  );

  // Open/close handlers
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === '/' && !open) {
        const target = e.target as HTMLElement | null;
        const isInput =
          target?.tagName === 'INPUT' ||
          target?.tagName === 'TEXTAREA' ||
          target?.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          setOpen(true);
        }
      }
    },
    [open],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    const onOpen = () => setOpen(true);
    window.addEventListener('cmd-palette:open', onOpen as EventListener);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('cmd-palette:open', onOpen as EventListener);
    };
  }, [onKeyDown]);

  // Autofocus input on open
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep activeIndex in range
  useEffect(() => {
    if (activeIndex >= flatResults.length) {
      setActiveIndex(0);
    }
  }, [flatResults, activeIndex]);

  // Scroll active into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const onListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(flatResults.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatResults[activeIndex];
      if (item) run(item);
    }
  };

  const overlayAndDialog =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="cmd-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={close}
                className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
                aria-hidden="true"
              />
            )}
            {open && (
              <motion.div
                key="cmd-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cmd-palette-title"
                initial={{ opacity: 0, scale: 0.96, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-x-0 top-0 sm:top-24 z-50 mx-auto w-[min(640px,92vw)]"
              >
                <div
                  className={cn(
                    'overflow-hidden rounded-2xl',
                    'bg-white/45 backdrop-blur-[24px] border-[0.5px] border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.03)]',
                    'dark:bg-slate-900/45 dark:border-white/10 dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.25)]',
                    'ring-1 ring-slate-200/80 dark:ring-slate-700/80',
                    'shadow-2xl shadow-slate-900/10 dark:shadow-slate-900/40',
                  )}
                  onKeyDown={onListKeyDown}
                >
                  <h2 id="cmd-palette-title" className="sr-only">
                    جستجوی سریع فرمان‌ها
                  </h2>
                  {/* Search input */}
                  <div className="flex items-center gap-3 px-4 sm:px-5 h-14 border-b border-slate-200/70 dark:border-slate-700/70">
                    <HiOutlineMagnifyingGlass className="w-5 h-5 text-slate-400" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setActiveIndex(0);
                      }}
                      placeholder="جستجو در داشبورد…"
                      className="flex-1 bg-transparent outline-none text-base placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white"
                      aria-label="جستجو"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 border border-slate-200/70 dark:border-slate-700/70 rounded px-1.5 py-0.5">
                      Esc
                    </kbd>
                  </div>

                  {/* Results */}
                  <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2" role="listbox">
                    {flatResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-10 px-4 text-sm text-slate-500 dark:text-slate-400">
                        <HiOutlineMagnifyingGlass className="w-8 h-8 mb-3 opacity-50" />
                        <p>نتیجه‌ای برای «{query}» یافت نشد.</p>
                      </div>
                    ) : (
                      groupedResults.map(([group, items]) => (
                        <div key={group} className="mb-2 last:mb-0">
                          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {group}
                          </p>
                          {items.map((item) => {
                            const flatIndex = flatResults.findIndex((r) => r.id === item.id);
                            const isActive = flatIndex === activeIndex;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                data-cmd-index={flatIndex}
                                onMouseEnter={() => setActiveIndex(flatIndex)}
                                onClick={() => run(item)}
                                className={cn(
                                  'w-full text-right flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                                  isActive
                                    ? 'bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-900 dark:text-cyan-100'
                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60',
                                )}
                              >
                                <span
                                  className={cn(
                                    'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                                    isActive
                                      ? 'bg-cyan-500 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                                  )}
                                >
                                  {item.icon}
                                </span>
                                <span className="flex-1 text-sm font-semibold truncate">
                                  {item.label}
                                </span>
                                {item.shortcut && (
                                  <kbd
                                    className={cn(
                                      'hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold',
                                      isActive
                                        ? 'text-cyan-700/80 dark:text-cyan-200/80'
                                        : 'text-slate-400 dark:text-slate-500',
                                    )}
                                  >
                                    {item.shortcut.split(' ').map((k, i) => (
                                      <span
                                        key={i}
                                        className="rounded border border-current/30 px-1.5 py-0.5"
                                      >
                                        {k}
                                      </span>
                                    ))}
                                  </kbd>
                                )}
                                <HiOutlineArrowLeft
                                  className={cn(
                                    'w-3.5 h-3.5',
                                    isActive ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <HiOutlineCommandLine className="w-3.5 h-3.5" />
                        <span>⌘K</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <kbd className="rounded border border-current/30 px-1 py-0.5 font-mono">
                          ↑
                        </kbd>
                        <kbd className="rounded border border-current/30 px-1 py-0.5 font-mono">
                          ↓
                        </kbd>
                        <span className="ms-1">پیمایش</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <kbd className="rounded border border-current/30 px-1 py-0.5 font-mono">
                          ↵
                        </kbd>
                        <span className="ms-1">انتخاب</span>
                      </span>
                    </div>
                    <span className="hidden sm:inline">{flatResults.length} نتیجه</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="باز کردن جستجوی سریع"
        className="fixed bottom-5 left-5 z-30 inline-flex items-center gap-2 px-3 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 ring-1 ring-slate-200/70 dark:ring-slate-700/70 backdrop-blur-md text-slate-700 dark:text-slate-200 text-sm font-medium shadow-lg hover:shadow-xl transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 print:hidden"
      >
        <HiOutlineMagnifyingGlass className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span>جستجو</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400">
          <span className="rounded border border-slate-300/70 dark:border-slate-600/70 px-1.5 py-0.5">
            ⌘
          </span>
          <span className="rounded border border-slate-300/70 dark:border-slate-600/70 px-1.5 py-0.5">
            K
          </span>
        </kbd>
      </button>
      {overlayAndDialog}
    </>
  );
}
