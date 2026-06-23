'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import { logout } from '@/actions/auth-actions';
import { useToast } from '@/components/ui/use-toast';
import Logo from '@/components/Logo/Logo';
import {
  HiOutlineHome,
  HiOutlineDocumentText,
  HiOutlineUsers,
  HiOutlineSquares2X2,
  HiOutlineMegaphone,
  HiOutlineCurrencyDollar,
  HiOutlineCog6Tooth,
  HiOutlineChartBarSquare,
  HiOutlineUserCircle,
  HiOutlineArrowRightOnRectangle,
  HiOutlineChevronDown,
  HiOutlineBars3,
  HiOutlineClipboardDocumentList,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Avatar from '@/components/Avatar/Avatar';

interface SubmenuItem {
  href: string;
  label: string;
}

interface MenuItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  submenu?: SubmenuItem[];
}

interface SidebarProps {
  userRole: 'USER' | 'AUTHOR' | 'ADMIN' | 'SUPER_ADMIN';
}

const getMenuItems = (role: string) => {
  const baseItems = [
    {
      title: 'داشبورد',
      href: '/dashboard',
      icon: <HiOutlineHome className="w-5 h-5" />,
      label: 'داشبورد',
    },
  ];

  const postItem = {
    title: 'پست‌ها',
    href: '/dashboard/posts',
    icon: <HiOutlineDocumentText className="w-5 h-5" />,
    label: 'پست ها',
  };

  const adminItems = [
    {
      title: 'کاربران',
      href: '/dashboard/users',
      icon: <HiOutlineUsers className="w-5 h-5" />,
      label: 'کاربران',
    },
    {
      title: 'دسته بندی',
      href: '/dashboard/categories',
      icon: <HiOutlineSquares2X2 className="w-5 h-5" />,
      label: 'دسته بندی',
    },
    {
      title: 'تبلیغات',
      href: '/dashboard/advertisements',
      icon: <HiOutlineMegaphone className="w-5 h-5" />,
      label: 'تبلیغات',
    },
    {
      title: 'تبلیغ بالای هدر',
      href: '/dashboard/header-ad',
      icon: <HiOutlineSparkles className="w-5 h-5" />,
      label: 'تبلیغ هدر',
    },
    {
      title: 'درخواست‌های خدمات',
      href: '/dashboard/service-requests',
      icon: <HiOutlineClipboardDocumentList className="w-5 h-5" />,
      label: 'درخواست‌ها',
    },
    {
      title: 'نرخ ارزها',
      href: '#',
      icon: <HiOutlineCurrencyDollar className="w-5 h-5" />,
      label: 'نرخ ارزها',
      submenu: [
        { href: '/dashboard/exchange-rates', label: 'نرخ تکی' },
        { href: '/dashboard/rate-lists', label: 'نرخ لیستی' },
      ],
    },
  ];

  const superAdminItems = [
    ...adminItems,
    {
      title: 'تنظیمات سیستم',
      href: '/dashboard/settings',
      icon: <HiOutlineCog6Tooth className="w-5 h-5" />,
      label: 'تنظیمات سیستم',
    },
    {
      title: 'گزارش‌ها',
      href: '/dashboard/reports',
      icon: <HiOutlineChartBarSquare className="w-5 h-5" />,
      label: 'گزارش‌ها',
    },
  ];

  const profileItem = {
    title: 'پروفایل من',
    href: '/dashboard/edit-profile',
    icon: <HiOutlineUserCircle className="w-5 h-5" />,
    label: 'پروفایل من',
  };

  switch (role) {
    case 'SUPER_ADMIN':
      return [...baseItems, postItem, ...superAdminItems, profileItem];
    case 'ADMIN':
      return [...baseItems, postItem, ...adminItems, profileItem];
    case 'AUTHOR':
      return [
        ...baseItems,
        postItem,
        {
          title: 'دسته بندی',
          href: '/dashboard/categories',
          icon: <HiOutlineSquares2X2 className="w-5 h-5" />,
          label: 'دسته بندی',
        },
        profileItem,
      ];
    default:
      return [];
  }
};

// Site Name Component
const SiteName = () => {
  const siteName = useSiteSettings((state) => state.siteName);
  return <span className="text-lg font-bold text-white">{siteName || 'داشبورد'}</span>;
};

const Sidebar = ({ userRole }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const menuItems: MenuItem[] = getMenuItems(userRole);
  const { data: session } = useSession();

  const userInfo = session?.user;

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        toast({
          title: 'خروج موفق',
          description: 'شما با موفقیت از حساب کاربری خود خارج شدید.',
          variant: 'success',
        });
        router.push('/auth');
      } else {
        toast({
          title: 'خطا در خروج',
          description:
            extractMessage(result) ||
            'مشکلی در خروج از حساب کاربری پیش آمد.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'خطای سیستمی',
        description: 'مشکلی در سیستم رخ داده است.',
        variant: 'destructive',
      });
    }
  };

  const toggleSubmenu = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label],
    );
  };

  const handleItemClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  // Calculate width based on state.
  // On mobile we clamp to 85vw so a 320px screen still leaves room for content;
  // the sidebar is overlaid on top of the content (see layout) so it never
  // coexists with the main content area on phones.
  const sidebarWidth = isMobile
    ? isOpen
      ? 'min(280px, 85vw)'
      : 0
    : isOpen
      ? 260
      : 76;

  return (
    <>
      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      <nav
        dir="rtl"
        className="fixed top-0 right-0 h-full z-40 overflow-hidden flex flex-col transition-all duration-300 ease-out"
        style={{
          width: sidebarWidth,
          background:
            'linear-gradient(180deg, oklch(16% 0.03 260) 0%, oklch(12% 0.025 258) 55%, oklch(10% 0.02 255) 100%)',
          boxShadow: isOpen
            ? '0 0 50px rgba(56, 189, 248, 0.10), -4px 0 24px rgba(0, 0, 0, 0.45)'
            : '-2px 0 12px rgba(0, 0, 0, 0.35)',
          borderInlineStart: '1px solid oklch(40% 0.03 255 / 0.35)',
        }}
      >
        {/* Aurora decorations — navy + emerald */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-24 -right-16 w-48 h-48 rounded-full opacity-40 anim-aurora-a"
            style={{ background: 'radial-gradient(circle, oklch(62% 0.16 255 / 0.55) 0%, transparent 70%)', filter: 'blur(28px)' }}
          />
          <div
            className="absolute bottom-24 -left-12 w-40 h-40 rounded-full opacity-30 anim-aurora-b"
            style={{ background: 'radial-gradient(circle, oklch(68% 0.13 165 / 0.5) 0%, transparent 70%)', filter: 'blur(28px)' }}
          />
        </div>

        {/* Header */}
        <div className="relative flex-shrink-0 p-4">
          <div className="flex justify-between items-center">
            {isOpen && (
              <div className="flex items-center gap-3 transition-opacity duration-200">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-xl blur-lg" />
                  <Logo className="relative w-10 h-10 rounded-xl" />
                </div>
                <SiteName />
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
            >
              <HiOutlineBars3
                className="w-5 h-5 transition-transform duration-300"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="relative flex-1 overflow-y-auto sidebar-scroll px-3 py-2">
          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = isActiveRoute(item.href);

              return (
                <li key={item.href}>
                  {item.submenu ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleSubmenu(item.label)}
                        className={`flex items-center w-full p-3 rounded-xl transition-all duration-200 hover:translate-x-1 ${
                          isActive
                            ? 'bg-gradient-to-l from-emerald-400/15 to-indigo-500/15 text-white shadow-[0_0_0_1px_oklch(70%_0.14_200_/_0.35),0_8px_24px_-12px_oklch(62%_0.16_220_/_0.6)] ring-1 ring-emerald-300/20'
                            : 'text-white/65 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-200 ${
                            isActive ? 'dash-ico dash-ico--emerald !shadow-none' : 'bg-white/5 text-white/80'
                          }`}
                        >
                          {item.icon}
                        </div>
                        {isOpen && (
                          <div className="mr-3 flex-1 flex items-center justify-between">
                            <span className="font-medium">{item.label}</span>
                            <HiOutlineChevronDown
                              className="w-4 h-4 transition-transform duration-200"
                              style={{
                                transform: expandedItems.includes(item.label) ? 'rotate(180deg)' : 'rotate(0deg)',
                              }}
                            />
                          </div>
                        )}
                      </button>

                      {isOpen && expandedItems.includes(item.label) && (
                        <ul className="pr-12 mt-1.5 space-y-1 overflow-hidden">
                          {item.submenu.map((submenuItem) => (
                            <li key={submenuItem.href}>
                              <Link href={submenuItem.href} onClick={handleItemClick}>
                                <span
                                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 hover:translate-x-1 ${
                                    pathname === submenuItem.href
                                      ? 'bg-white/15 text-white'
                                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                                      pathname === submenuItem.href ? 'bg-violet-300' : 'bg-white/40'
                                    }`}
                                  />
                                  <span className="text-sm font-medium">{submenuItem.label}</span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link href={item.href} onClick={handleItemClick}>
                      <span
                        className={`flex items-center p-3 rounded-xl transition-all duration-200 hover:translate-x-1 ${
                          isActive
                            ? 'bg-gradient-to-l from-emerald-400/15 to-indigo-500/15 text-white shadow-[0_0_0_1px_oklch(70%_0.14_200_/_0.35),0_8px_24px_-12px_oklch(62%_0.16_220_/_0.6)] ring-1 ring-emerald-300/20'
                            : 'text-white/65 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-200 ${
                            isActive ? 'dash-ico dash-ico--emerald !shadow-none' : 'bg-white/5 text-white/80'
                          }`}
                        >
                          {item.icon}
                        </div>
                        {isOpen && <span className="mr-3 font-medium">{item.label}</span>}
                      </span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative flex-shrink-0 p-3 border-t border-white/10">
          {/* Logout button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full p-3 mb-3 rounded-xl text-white/70 hover:bg-rose-500/20 hover:text-rose-300 transition-all duration-200 hover:translate-x-1"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5">
              <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            </div>
            {isOpen && <span className="mr-3 font-medium">خروج</span>}
          </button>

          {/* User info */}
          <div
            className={`flex items-center p-3 rounded-xl bg-white/10 backdrop-blur-sm transition-all duration-200 ${
              !isOpen ? 'justify-center' : ''
            }`}
          >
            <div className="relative flex-shrink-0">
              <Avatar
                imgUrl={userInfo?.image}
                userName={userInfo?.name}
                sizeClass="w-10 h-10"
                containerClassName="ring-2 ring-white/30"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-indigo-900" />
            </div>
            {isOpen && (
              <div className="mr-3 overflow-hidden">
                <p className="font-semibold text-white truncate">{userInfo?.name || 'کاربر'}</p>
                <p className="text-xs text-white/60 truncate">{userInfo?.email}</p>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(false);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="بستن منو"
        />
      )}
    </>
  );
};

export default Sidebar;

// 2026-06-23: AuthResult fields are `message` for success and
// `error` for failure. Pick whichever is present.
function extractMessage(r: any): string | undefined {
  if (r && typeof r === 'object') {
    if (typeof r.error === 'string') return r.error;
    if (typeof r.message === 'string') return r.message;
  }
  return undefined;
}
