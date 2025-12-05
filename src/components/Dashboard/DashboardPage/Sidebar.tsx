'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  return <span className="text-sm sm:text-base lg:text-lg font-bold text-white truncate">{siteName || 'داشبورد'}</span>;
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
        router.push('/signin');
      } else {
        toast({
          title: 'خطا در خروج',
          description: result.message || 'مشکلی در خروج از حساب کاربری پیش آمد.',
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

  // Calculate width based on state
  const sidebarWidth = isMobile ? (isOpen ? '85%' : 0) : (isOpen ? 260 : 76);

  return (
    <>
      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
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
        @media (min-width: 640px) {
          .sidebar-scroll::-webkit-scrollbar {
            width: 6px;
          }
        }
      `}</style>

      <nav
        dir="rtl"
        className="fixed top-0 right-0 h-full z-[60] overflow-hidden flex flex-col transition-all duration-200 ease-in-out"
        style={{
          width: typeof sidebarWidth === 'number' ? sidebarWidth : sidebarWidth,
          maxWidth: isMobile ? '320px' : 'none',
          background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)',
          boxShadow: isOpen
            ? '0 0 40px rgba(99, 102, 241, 0.2), -4px 0 15px rgba(0, 0, 0, 0.15)'
            : '-2px 0 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-20 -left-10 w-32 h-32 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)' }}
          />
        </div>

        {/* Header */}
        <div className="relative flex-shrink-0 p-3 sm:p-4">
          <div className="flex justify-between items-center">
            {isOpen && (
              <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 animate-in fade-in slide-in-from-right-2 duration-150 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl blur-lg" />
                  <Logo className="relative w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl" />
                </div>
                <div className="min-w-0">
                  <SiteName />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-150 hover:scale-105 active:scale-95 flex-shrink-0"
              aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
            >
              <HiOutlineBars3
                className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="relative flex-1 overflow-y-auto sidebar-scroll px-2 sm:px-3 py-2">
          <ul className="space-y-1 sm:space-y-1.5">
            {menuItems.map((item) => {
              const isActive = isActiveRoute(item.href);

              return (
                <li key={item.href}>
                  {item.submenu ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleSubmenu(item.label)}
                        className={`flex items-center w-full p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl transition-all duration-150 hover:translate-x-1 ${
                          isActive
                            ? 'bg-white/20 text-white shadow-lg'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-colors duration-150 flex-shrink-0 ${
                            isActive ? 'bg-white/20' : 'bg-white/5'
                          }`}
                        >
                          {item.icon}
                        </div>
                        {isOpen && (
                          <div className="mr-2 sm:mr-3 flex-1 flex items-center justify-between animate-in fade-in slide-in-from-right-1 duration-100 min-w-0">
                            <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                            <HiOutlineChevronDown
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-150 flex-shrink-0"
                              style={{
                                transform: expandedItems.includes(item.label) ? 'rotate(180deg)' : 'rotate(0deg)',
                              }}
                            />
                          </div>
                        )}
                      </button>

                      {isOpen && expandedItems.includes(item.label) && (
                        <ul className="pr-8 sm:pr-10 lg:pr-12 mt-1 sm:mt-1.5 space-y-0.5 sm:space-y-1 overflow-hidden">
                          {item.submenu.map((submenuItem) => (
                            <li key={submenuItem.href}>
                              <Link href={submenuItem.href} onClick={handleItemClick}>
                                <span
                                  className={`flex items-center gap-2 sm:gap-2.5 lg:gap-3 p-2 sm:p-2.5 rounded-lg transition-all duration-150 hover:translate-x-1 ${
                                    pathname === submenuItem.href
                                      ? 'bg-white/15 text-white'
                                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  <span
                                    className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-colors duration-150 flex-shrink-0 ${
                                      pathname === submenuItem.href ? 'bg-violet-300' : 'bg-white/40'
                                    }`}
                                  />
                                  <span className="text-xs sm:text-sm font-medium truncate">{submenuItem.label}</span>
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
                        className={`flex items-center p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl transition-all duration-150 hover:translate-x-1 ${
                          isActive
                            ? 'bg-white/20 text-white shadow-lg'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-colors duration-150 flex-shrink-0 ${
                            isActive ? 'bg-white/20' : 'bg-white/5'
                          }`}
                        >
                          {item.icon}
                        </div>
                        {isOpen && <span className="mr-2 sm:mr-3 font-medium text-sm sm:text-base animate-in fade-in slide-in-from-right-1 duration-100 truncate">{item.label}</span>}
                      </span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative flex-shrink-0 p-2 sm:p-3 border-t border-white/10">
          {/* Logout button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full p-2 sm:p-2.5 lg:p-3 mb-2 sm:mb-3 rounded-lg sm:rounded-xl text-white/70 hover:bg-rose-500/20 hover:text-rose-300 transition-all duration-150 hover:translate-x-1"
          >
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/5 flex-shrink-0">
              <HiOutlineArrowRightOnRectangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            {isOpen && <span className="mr-2 sm:mr-3 font-medium text-sm sm:text-base animate-in fade-in slide-in-from-right-1 duration-100 truncate">خروج</span>}
          </button>

          {/* User info */}
          <div
            className={`flex items-center p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm transition-all duration-150 ${
              !isOpen ? 'justify-center' : ''
            }`}
          >
            <div className="relative flex-shrink-0">
              <Avatar
                imgUrl={userInfo?.image}
                userName={userInfo?.name}
                sizeClass="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10"
                containerClassName="ring-2 ring-white/30"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-400 rounded-full ring-1 sm:ring-2 ring-indigo-900" />
            </div>
            {isOpen && (
              <div className="mr-2 sm:mr-3 overflow-hidden animate-in fade-in slide-in-from-right-1 duration-100 min-w-0">
                <p className="font-semibold text-white truncate text-xs sm:text-sm">{userInfo?.name || 'کاربر'}</p>
                <p className="text-[10px] sm:text-xs text-white/60 truncate">{userInfo?.email}</p>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] animate-in fade-in duration-200"
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
