'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from '@/lib/motion-shim';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import Avatar from '@/components/Avatar/Avatar';
import { Icon } from '@/components/ui/icon';
import {
  HiOutlineBars3,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineCommandLine,
  HiOutlineBell,
  HiOutlineUserCircle,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';
import { Breadcrumb } from '@/components/Dashboard/primitives';
import { useBreadcrumb } from '@/hooks/useBreadcrumb';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/actions/auth-actions';
import { cn } from '@/lib/utils';

const getRoleBadge = (role?: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return { label: 'مدیر ارشد', color: 'from-rose-500 to-pink-600' };
    case 'ADMIN':
      return { label: 'مدیر', color: 'from-violet-500 to-purple-600' };
    case 'AUTHOR':
      return { label: 'نویسنده', color: 'from-amber-500 to-orange-500' };
    default:
      return { label: 'کاربر', color: 'from-slate-500 to-gray-600' };
  }
};

// Map the last URL segment to a Persian title for the fallback breadcrumb.
// Keep this table narrow — the preferred path is for individual pages to set
// their own items via `useBreadcrumb()` inside a PageHeader primitive.
const PATH_TITLE_LOOKUP: Record<string, string> = {
  '': 'داشبورد',
  posts: 'پست‌ها',
  users: 'کاربران',
  categories: 'دسته‌بندی‌ها',
  advertisements: 'تبلیغات',
  'header-ad': 'تبلیغ بالای هدر',
  'service-requests': 'درخواست‌های خدمات',
  'exchange-rates': 'نرخ ارزها',
  'rate-lists': 'نرخ لیستی',
  settings: 'تنظیمات سیستم',
  reports: 'گزارش‌ها',
  'edit-profile': 'پروفایل من',
  billing: 'آدرس‌های صورتحساب',
  subscription: 'اشتراک',
};

function getPersianTitleForPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  return PATH_TITLE_LOOKUP[last] ?? last;
}

// Sample notifications for the popover. In a future chunk this should be
// replaced by a SWR-fed list from /api/notifications.
const SAMPLE_NOTIFICATIONS: ReadonlyArray<{ id: string; title: string; time: string }> = [
  { id: 'n1', title: 'پست جدید منتشر شد', time: '۵ دقیقه پیش' },
  { id: 'n2', title: 'درخواست خدمات جدید ثبت شد', time: '۱ ساعت پیش' },
  { id: 'n3', title: 'گزارش هفتگی آماده است', time: 'دیروز' },
];

const Header: React.FC = () => {
  const user = useCurrentUser();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();
  const pathname = usePathname();
  const { items: breadcrumbItems } = useBreadcrumb();

  const roleBadge = getRoleBadge(user?.role);

  const breadcrumb = useMemo(() => {
    if (breadcrumbItems.length > 0) return breadcrumbItems;
    return [{ label: getPersianTitleForPath(pathname) }];
  }, [breadcrumbItems, pathname]);

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('cmd-palette:open'));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // best-effort; the server action redirects on success
    }
  };

  return (
    <header className="sticky top-0 z-30 h-14 bg-[color:var(--ds-color-canvas)]/80 backdrop-blur-sm border-b border-[color:var(--ds-color-border-subtle)]">
      <div className="relative h-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-row-reverse justify-between items-center gap-3">
        {/* Command-K pill — first child of the flex, visually on the start side (right in RTL) */}
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="باز کردن جستجوی سریع"
          className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--ds-color-border-subtle)] bg-[color:var(--ds-color-surface)] px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <HiOutlineCommandLine className="w-3.5 h-3.5" aria-hidden="true" />
          <kbd className="font-mono font-semibold">⌘K</kbd>
        </button>

        {/* Center breadcrumb slot — flexes to fill the middle */}
        <div className="hidden md:flex flex-1 justify-center min-w-0">
          <Breadcrumb items={breadcrumb} />
        </div>

        {/* Right side — user section, mirrored to the visual left in RTL via flex-row-reverse */}
        <div className="flex items-center gap-2">
          {/* Notifications popover */}
          <Popover>
            <PopoverTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                className="relative flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-200"
                aria-label="اعلان‌ها"
              >
                <Icon name="Bell" className="w-5 h-5" aria-hidden="true" />
                {/* Unread dot — pulses via the existing .dash-livedot keyframe */}
                <span
                  className="dash-livedot absolute -top-0.5 -end-0.5"
                  aria-hidden="true"
                />
              </motion.button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
              <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/70">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  اعلان‌ها
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  آخرین رویدادهای داشبورد
                </p>
              </div>
              <ul className="max-h-80 overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-700/70">
                {SAMPLE_NOTIFICATIONS.map((n) => (
                  <li
                    key={n.id}
                    className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                        <HiOutlineBell className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {n.time}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2 border-t border-slate-200/70 dark:border-slate-700/70 text-center">
                <button
                  type="button"
                  className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 rounded"
                >
                  مشاهده همه
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Dark mode switch — spring-eased container */}
          <div className="mx-1 transition-transform duration-200 ease-[var(--ds-ease-spring)]">
            <SwitchDarkMode />
          </div>

          {/* User dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.02 }}
                type="button"
                className={cn(
                  'group flex items-center gap-3 p-1.5 pr-4 rounded-2xl',
                  'bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/80',
                  'hover:from-violet-50 hover:to-purple-50 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30',
                  'border border-slate-200/80 dark:border-slate-700/80',
                  'transition-all duration-300',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
                )}
                style={{
                  boxShadow:
                    '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)',
                }}
                aria-label="منوی کاربر"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                    {user?.name || 'کاربر'}
                  </p>
                </div>
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-opacity duration-300" />
                  <Avatar
                    imgUrl={user?.profile?.avatar}
                    userName={user?.name}
                    sizeClass="h-10 w-10"
                    containerClassName="relative ring-2 ring-violet-500/20 group-hover:ring-violet-500/50 transition-all duration-300"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                </div>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="min-w-[240px]">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className={cn('p-2.5 rounded-xl bg-gradient-to-r', roleBadge.color)}>
                  <HiOutlineShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="text-right min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">سطح دسترسی</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <HiOutlineSparkles className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {roleBadge.label}
                    </p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/edit-profile" className="flex items-center gap-3 w-full">
                  <HiOutlineUserCircle className="w-4 h-4" aria-hidden="true" />
                  <span>مشاهده پروفایل</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-3 w-full">
                  <HiOutlineCog6Tooth className="w-4 h-4" aria-hidden="true" />
                  <span>تنظیمات</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  void handleLogout();
                }}
                className="text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300"
              >
                <HiOutlineArrowRightOnRectangle className="w-4 h-4" aria-hidden="true" />
                <span>خروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Left side — Mobile menu button (last child, visually on the left in RTL) */}
        <div className="flex items-center md:hidden">
          {isMobile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-200"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
            >
              <HiOutlineBars3 className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
