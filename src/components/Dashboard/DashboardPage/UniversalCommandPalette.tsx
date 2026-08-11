'use client';

/**
 * UniversalCommandPalette — unified ⌘K search for ALL dashboards.
 *
 * Replaces the Admin-only CommandPalette with a portal-aware version.
 * Each portal (admin, exchange, customer) gets its own items.
 *
 * Usage in any layout:
 *   <UniversalCommandPalette portal="admin" role="OWNER" />
 *   <UniversalCommandPalette portal="exchange" role="OWNER" />
 *   <UniversalCommandPalette portal="customer" />
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
  HiOutlineBanknotes,
  HiOutlineBell,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineKey,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlineShieldCheck,
  HiOutlineSquares2X2,
  HiOutlineUserCircle,
  HiOutlineUsers,
} from 'react-icons/hi2';

// ─── Types ──────────────────────────────────────────────────────────────

export type PortalType = 'admin' | 'exchange' | 'customer';
export type UserRole = 'OWNER' | 'SUPERADMIN' | 'ADMIN' | 'AUTHOR' | 'SUPPORT' | 'USER';

interface UniversalCommandPaletteProps {
  portal: PortalType;
  role?: UserRole;
  exchangeName?: string;
}

interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  href: string;
  shortcut?: string;
  keywords?: string[];
}

// ─── Admin items ────────────────────────────────────────────────────────

const ADMIN_ITEMS: CommandItem[] = [
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
    id: 'posts',
    label: 'نوشتارها',
    group: 'محتوا',
    icon: <HiOutlineDocumentText className="w-4 h-4" />,
    href: '/dashboard/posts',
    shortcut: 'G P',
    keywords: ['مقالات', 'نوشته'],
  },
  {
    id: 'new-post',
    label: 'نوشتن پست جدید',
    group: 'اقدام‌ها',
    icon: <HiOutlinePencilSquare className="w-4 h-4" />,
    href: '/dashboard/posts/create',
    shortcut: 'C',
    keywords: ['ایجاد', 'مطلب'],
  },
  {
    id: 'categories',
    label: 'دسته‌بندی‌ها',
    group: 'محتوا',
    icon: <HiOutlineSquares2X2 className="w-4 h-4" />,
    href: '/dashboard/categories',
    keywords: ['دسته'],
  },
  {
    id: 'exchanges',
    label: 'صرافی‌ها',
    group: 'پیمایش',
    icon: <HiOutlineUsers className="w-4 h-4" />,
    href: '/dashboard/exchanges',
    shortcut: 'G E',
    keywords: ['صراف'],
  },
  {
    id: 'customers',
    label: 'مشتریان',
    group: 'پیمایش',
    icon: <HiOutlineUserCircle className="w-4 h-4" />,
    href: '/dashboard/customers',
    shortcut: 'G C',
    keywords: ['کاربر'],
  },
  {
    id: 'exchange-rates',
    label: 'نرخ ارزها',
    group: 'صرافی',
    icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
    href: '/dashboard/exchange-rates',
    keywords: ['دلار', 'یورو', 'طلا'],
  },
  {
    id: 'rate-lists',
    label: 'نرخ لیستی',
    group: 'صرافی',
    icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
    href: '/dashboard/rate-lists',
  },
  {
    id: 'reports',
    label: 'گزارش‌ها',
    group: 'پیمایش',
    icon: <HiOutlineChartBar className="w-4 h-4" />,
    href: '/dashboard/reports',
    shortcut: 'G R',
  },
  {
    id: 'service-requests',
    label: 'درخواست‌های خدمات',
    group: 'پیمایش',
    icon: <HiOutlineClipboardDocumentList className="w-4 h-4" />,
    href: '/dashboard/service-requests',
    keywords: ['سفارش'],
  },
  {
    id: 'helpdesk',
    label: 'پشتیبانی',
    group: 'پیمایش',
    icon: <HiOutlineBell className="w-4 h-4" />,
    href: '/dashboard/helpdesk',
    shortcut: 'G K',
    keywords: ['تیکت'],
  },
  {
    id: 'site-guide',
    label: 'راهنمای سایت',
    group: 'پیمایش',
    icon: <HiOutlineDocumentText className="w-4 h-4" />,
    href: '/dashboard/site-guide',
    keywords: ['راهنما', 'نقشه سایت'],
  },
  {
    id: 'kyc-review',
    label: 'بررسی احراز هویت',
    group: 'عملیات',
    icon: <HiOutlineShieldCheck className="w-4 h-4" />,
    href: '/dashboard/kyc-review',
    keywords: ['KYC', 'احراز'],
  },
  {
    id: 'settings',
    label: 'تنظیمات',
    group: 'پیمایش',
    icon: <HiOutlineCog6Tooth className="w-4 h-4" />,
    href: '/dashboard/settings',
    shortcut: 'G S',
  },
  {
    id: 'profile',
    label: 'پروفایل',
    group: 'پیمایش',
    icon: <HiOutlineUserCircle className="w-4 h-4" />,
    href: '/dashboard/profile',
  },
];

// ─── Exchange items ─────────────────────────────────────────────────────

const EXCHANGE_ITEMS: CommandItem[] = [
  {
    id: 'home',
    label: 'داشبورد صراف',
    group: 'پیمایش',
    icon: <HiOutlineHome className="w-4 h-4" />,
    href: '/exchange/dashboard',
    shortcut: 'G H',
  },
  {
    id: 'quotes',
    label: 'قیمت‌گذاری',
    group: 'پیمایش',
    icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
    href: '/exchange/quotes',
    keywords: ['نرخ', 'قیمت'],
  },
  {
    id: 'rates',
    label: 'نرخ‌ها',
    group: 'پیمایش',
    icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
    href: '/exchange/rates',
  },
  {
    id: 'customers',
    label: 'مشتریان',
    group: 'پیمایش',
    icon: <HiOutlineUsers className="w-4 h-4" />,
    href: '/exchange/customers',
  },
  {
    id: 'transactions',
    label: 'تراکنش‌ها',
    group: 'پیمایش',
    icon: <HiOutlineBanknotes className="w-4 h-4" />,
    href: '/exchange/transactions',
  },
  {
    id: 'new-customer',
    label: 'مشتری جدید',
    group: 'اقدام‌ها',
    icon: <HiOutlineUserCircle className="w-4 h-4" />,
    href: '/exchange/customers/new',
  },
  {
    id: 'settings',
    label: 'تنظیمات صراف',
    group: 'پیمایش',
    icon: <HiOutlineCog6Tooth className="w-4 h-4" />,
    href: '/exchange/settings',
  },
  {
    id: 'profile',
    label: 'پروفایل',
    group: 'پیمایش',
    icon: <HiOutlineUserCircle className="w-4 h-4" />,
    href: '/exchange/settings/profile',
  },
];

// ─── Customer items ─────────────────────────────────────────────────────

const CUSTOMER_ITEMS: CommandItem[] = [
  {
    id: 'home',
    label: 'داشبورد',
    group: 'پیمایش',
    icon: <HiOutlineHome className="w-4 h-4" />,
    href: '/customer/dashboard',
    shortcut: 'G H',
  },
  {
    id: 'transfer',
    label: 'انتقال وجه',
    group: 'اقدام‌ها',
    icon: <HiOutlineBanknotes className="w-4 h-4" />,
    href: '/customer/transfer',
    keywords: ['واریز', 'برداشت'],
  },
  {
    id: 'wallet',
    label: 'کیف پول',
    group: 'پیمایش',
    icon: <HiOutlineCreditCard className="w-4 h-4" />,
    href: '/customer/wallet',
    keywords: ['موجودی'],
  },
  {
    id: 'accounts',
    label: 'حساب‌ها',
    group: 'پیمایش',
    icon: <HiOutlineBanknotes className="w-4 h-4" />,
    href: '/customer/accounts',
  },
  {
    id: 'transactions',
    label: 'تراکنش‌ها',
    group: 'پیمایش',
    icon: <HiOutlineBanknotes className="w-4 h-4" />,
    href: '/customer/transactions',
  },
  {
    id: 'crypto',
    label: 'ارز دیجیتال',
    group: 'پیمایش',
    icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
    href: '/customer/crypto',
    keywords: ['بیت‌کوین', 'اتریوم'],
  },
  {
    id: 'kyc',
    label: 'احراز هویت',
    group: 'پیمایش',
    icon: <HiOutlineShieldCheck className="w-4 h-4" />,
    href: '/customer/kyc',
  },
  {
    id: 'security',
    label: 'امنیت',
    group: 'پیمایش',
    icon: <HiOutlineKey className="w-4 h-4" />,
    href: '/customer/security',
    keywords: ['2FA', 'رمز'],
  },
  {
    id: 'notifications',
    label: 'اعلان‌ها',
    group: 'پیمایش',
    icon: <HiOutlineBell className="w-4 h-4" />,
    href: '/customer/notifications',
  },
  {
    id: 'requests',
    label: 'درخواست‌ها',
    group: 'پیمایش',
    icon: <HiOutlineClipboardDocumentList className="w-4 h-4" />,
    href: '/customer/requests',
  },
  {
    id: 'documents',
    label: 'مدارک',
    group: 'پیمایش',
    icon: <HiOutlineDocumentText className="w-4 h-4" />,
    href: '/customer/documents',
  },
  {
    id: 'profile',
    label: 'پروفایل',
    group: 'پیمایش',
    icon: <HiOutlineUserCircle className="w-4 h-4" />,
    href: '/customer/profile',
  },
  {
    id: 'settings',
    label: 'تنظیمات',
    group: 'پیمایش',
    icon: <HiOutlineCog6Tooth className="w-4 h-4" />,
    href: '/customer/settings',
  },
];

// ─── Fuzzy search ───────────────────────────────────────────────────────

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q) return true;
  if (t.includes(q)) return true;
  // Persian character-by-character
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ─── Component ──────────────────────────────────────────────────────────

export default function UniversalCommandPalette({
  portal,
  role: _role,
  exchangeName: _exchangeName,
}: UniversalCommandPaletteProps) {
  // _role: reserved for future role-based filtering within each portal
  // _exchangeName: reserved for future personalized labels in exchange portal
  void _role;
  void _exchangeName;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Resolve items based on portal
  const allItems = useMemo(() => {
    switch (portal) {
      case 'exchange':
        return EXCHANGE_ITEMS;
      case 'customer':
        return CUSTOMER_ITEMS;
      default:
        return ADMIN_ITEMS;
    }
  }, [portal]);

  // Filter + group
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const matched = allItems.filter((item) => {
      if (!q) return true;
      if (fuzzyMatch(q, item.label)) return true;
      if (fuzzyMatch(q, item.group)) return true;
      if (item.keywords?.some((kw) => fuzzyMatch(q, kw))) return true;
      return false;
    });
    return matched;
  }, [query, allItems]);

  // Grouped results
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of results) {
      const group = map.get(item.group) ?? [];
      group.push(item);
      map.set(item.group, group);
    }
    return map;
  }, [results]);

  // Flat list for keyboard navigation
  const flatList = useMemo(() => Array.from(grouped.values()).flat(), [grouped]);

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
        setSelectedIndex(0);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        setOpen(false);
        setQuery('');
        setSelectedIndex(0);
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && flatList[selectedIndex]) {
        e.preventDefault();
        const item = flatList[selectedIndex];
        router.push(item.href);
        setOpen(false);
        setQuery('');
        setSelectedIndex(0);
      }
    },
    [flatList, selectedIndex, router],
  );

  // Trigger button position
  const triggerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '1rem',
    left: '1rem',
    zIndex: 9999,
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setQuery('');
          setSelectedIndex(0);
        }}
        style={triggerStyle}
        className={cn(
          'flex items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-lg backdrop-blur-sm',
          'bg-white/80 border-gray-200 text-gray-500 hover:text-gray-700',
          'dark:bg-gray-900/80 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
        )}
        aria-label="جستجوی سریع"
        title="جستجوی سریع (Ctrl+K)"
      >
        <HiOutlineMagnifyingGlass className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">جستجو...</span>
        <kbd
          className={cn(
            'inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-mono',
            'border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500',
          )}
        >
          ⌘K
        </kbd>
      </button>

      {/* Portal overlay */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="fixed inset-0 z-[10000] flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-label="جستجوی سریع"
              >
                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden',
                    'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700',
                  )}
                >
                  {/* Search input */}
                  <div className="flex items-center gap-3 border-b px-4 py-3 dark:border-gray-700">
                    <HiOutlineMagnifyingGlass className="w-5 h-5 text-gray-400 shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSelectedIndex(0);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="جستجو کنید..."
                      className={cn(
                        'flex-1 bg-transparent text-sm outline-none placeholder-gray-400',
                        'dark:text-gray-100 dark:placeholder-gray-500',
                      )}
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setQuery('');
                        setSelectedIndex(0);
                      }}
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-mono',
                        'border border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500',
                      )}
                    >
                      Esc
                    </button>
                  </div>

                  {/* Results */}
                  <div className="max-h-[60vh] overflow-y-auto p-2">
                    {flatList.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400" dir="rtl">
                        نتیجه‌ای یافت نشد
                      </div>
                    ) : (
                      Array.from(grouped.entries()).map(([group, items]) => (
                        <div key={group} className="mb-2">
                          <div
                            className="px-3 py-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500"
                            dir="rtl"
                          >
                            {group}
                          </div>
                          {items.map((item) => {
                            const globalIdx = flatList.indexOf(item);
                            const isActive = globalIdx === selectedIndex;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  router.push(item.href);
                                  setOpen(false);
                                  setQuery('');
                                  setSelectedIndex(0);
                                }}
                                onMouseEnter={() => setSelectedIndex(globalIdx)}
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                                  'rtl:text-right',
                                  isActive
                                    ? 'bg-gray-100 dark:bg-gray-800'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                                )}
                                dir="rtl"
                              >
                                <span className="shrink-0 text-gray-500 dark:text-gray-400">
                                  {item.icon}
                                </span>
                                <span className="flex-1 text-gray-700 dark:text-gray-200">
                                  {item.label}
                                </span>
                                {item.shortcut && (
                                  <span className="shrink-0 text-[10px] font-mono text-gray-400 dark:text-gray-500 ltr:text-left">
                                    {item.shortcut}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t px-4 py-2 dark:border-gray-700">
                    <span className="text-[10px] text-gray-400" dir="rtl">
                      ↑↓ ناوبری · Enter انتخاب · Esc بستن
                    </span>
                    <span className="text-[10px] text-gray-400">{flatList.length} نتیجه</span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
