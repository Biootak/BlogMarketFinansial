'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { logout } from '@/actions/auth-actions';
import { useToast } from '@/components/ui/use-toast';
import Logo from '@/components/Logo/Logo';
import Avatar from '@/components/Avatar/Avatar';
import { useSidebarStore } from '@/hooks/sidebarStore';
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
  HiOutlineChevronLeft,
  HiOutlineXMark,
  HiOutlineClipboardDocumentList,
  HiOutlineSparkles,
} from 'react-icons/hi2';

// Hotkey badges are decorative; no keyboard handlers are wired.
// They remain in the DOM to preserve the v1 visual without misleading users.
const HOTKEY_MAP: Record<string, string> = {
  'داشبورد': '1',
  'پست‌ها': '2',
  'کاربران': '3',
  'دسته‌بندی': '4',
  'تبلیغات': '5',
  'تبلیغ بالای هدر': '6',
  'درخواست‌های خدمات': '7',
  'تنظیمات سیستم': 'S',
  'گزارش‌ها': 'R',
  'پروفایل من': 'P',
};

interface SubmenuItem {
  href: string;
  label: string;
}

interface MenuItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  title?: string;
  submenu?: SubmenuItem[];
}

interface SidebarProps {
  userRole: 'USER' | 'AUTHOR' | 'ADMIN' | 'SUPER_ADMIN';
}

const getMenuItems = (role: string): MenuItem[] => {
  const baseItems: MenuItem[] = [
    {
      title: 'داشبورد',
      href: '/dashboard',
      icon: <HiOutlineHome className="w-[18px] h-[18px]" />,
      label: 'داشبورد',
    },
  ];

  const postItem: MenuItem = {
    title: 'پست‌ها',
    href: '/dashboard/posts',
    icon: <HiOutlineDocumentText className="w-[18px] h-[18px]" />,
    label: 'پست ها',
  };

  const adminItems: MenuItem[] = [
    {
      title: 'کاربران',
      href: '/dashboard/users',
      icon: <HiOutlineUsers className="w-[18px] h-[18px]" />,
      label: 'کاربران',
    },
    {
      title: 'دسته بندی',
      href: '/dashboard/categories',
      icon: <HiOutlineSquares2X2 className="w-[18px] h-[18px]" />,
      label: 'دسته بندی',
    },
    {
      title: 'تبلیغات',
      href: '/dashboard/advertisements',
      icon: <HiOutlineMegaphone className="w-[18px] h-[18px]" />,
      label: 'تبلیغات',
    },
    {
      title: 'تبلیغ بالای هدر',
      href: '/dashboard/header-ad',
      icon: <HiOutlineSparkles className="w-[18px] h-[18px]" />,
      label: 'تبلیغ هدر',
    },
    {
      title: 'درخواست‌های خدمات',
      href: '/dashboard/service-requests',
      icon: <HiOutlineClipboardDocumentList className="w-[18px] h-[18px]" />,
      label: 'درخواست‌ها',
    },
    {
      title: 'نرخ ارزها',
      href: '#',
      icon: <HiOutlineCurrencyDollar className="w-[18px] h-[18px]" />,
      label: 'نرخ ارزها',
      submenu: [
        { href: '/dashboard/exchange-rates', label: 'نرخ تکی' },
        { href: '/dashboard/rate-lists', label: 'نرخ لیستی' },
      ],
    },
  ];

  const superAdminItems: MenuItem[] = [
    ...adminItems,
    {
      title: 'تنظیمات سیستم',
      href: '/dashboard/settings',
      icon: <HiOutlineCog6Tooth className="w-[18px] h-[18px]" />,
      label: 'تنظیمات سیستم',
    },
    {
      title: 'گزارش‌ها',
      href: '/dashboard/reports',
      icon: <HiOutlineChartBarSquare className="w-[18px] h-[18px]" />,
      label: 'گزارش‌ها',
    },
  ];

  const profileItem: MenuItem = {
    title: 'پروفایل من',
    href: '/dashboard/edit-profile',
    icon: <HiOutlineUserCircle className="w-[18px] h-[18px]" />,
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
          icon: <HiOutlineSquares2X2 className="w-[18px] h-[18px]" />,
          label: 'دسته بندی',
        },
        profileItem,
      ];
    default:
      return [];
  }
};

/* SiteName + brand-text + brand-tag removed: the brand header now renders
   only the logo. Site name + the "پروژه‌ی فعال" tag were visual noise at
   the top of a navigation chrome. */

interface NavItemProps {
  item: MenuItem;
  isOpen: boolean;
  isActive: boolean;
  expandedItems: string[];
  setExpandedItems: React.Dispatch<React.SetStateAction<string[]>>;
  handleItemClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  item,
  isOpen,
  isActive,
  expandedItems,
  setExpandedItems,
  handleItemClick,
}) => {
  const pathname = usePathname();
  const isExpanded = expandedItems.includes(item.label);
  const hotkey = HOTKEY_MAP[item.title || item.label];

  if (item.submenu) {
    const isSubActive = item.submenu.some((s) => pathname === s.href);
    return (
      <li>
        <button
          type="button"
          className="dash-side__item"
          data-active={isSubActive || undefined}
          data-expanded={isExpanded || undefined}
          aria-expanded={isExpanded}
          aria-controls={`dash-side-sub-${item.label}`}
          onClick={() =>
            setExpandedItems((p) =>
              p.includes(item.label) ? p.filter((x) => x !== item.label) : [...p, item.label],
            )
          }
        >
          <span className="dash-side__item-ico">{item.icon}</span>
          {isOpen && <span className="dash-side__item-label">{item.label}</span>}
          {isOpen && hotkey && (
            <kbd className="dash-side__item-kbd">{hotkey}</kbd>
          )}
          {isOpen && (
            <HiOutlineChevronDown className="dash-side__item-chev" aria-hidden />
          )}
        </button>
        <div
          id={`dash-side-sub-${item.label}`}
          className="dash-side__sub"
          data-open={isExpanded || undefined}
        >
          <div className="dash-side__sub-inner">
            {item.submenu.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={handleItemClick}
                className="dash-side__item"
                data-active={pathname === sub.href || undefined}
                aria-current={pathname === sub.href ? 'page' : undefined}
              >
                <span className="dash-side__item-label">{sub.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        onClick={handleItemClick}
        className="dash-side__item"
        data-active={isActive || undefined}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="dash-side__item-ico">{item.icon}</span>
        {isOpen && <span className="dash-side__item-label">{item.label}</span>}
        {isOpen && hotkey && <kbd className="dash-side__item-kbd">{hotkey}</kbd>}
      </Link>
    </li>
  );
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

  const handleItemClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  // data-state drives the CSS width; the attribute value must stay in sync
  // with the rules in globals.css (.dash-side[data-state="..."]).
  const dataState: string = isMobile
    ? isOpen
      ? 'mobile-open'
      : 'mobile-closed'
    : isOpen
      ? 'expanded'
      : 'rail';

  return (
    <>
      <aside className="dash-side" data-state={dataState} aria-label="منوی داشبورد">
        {/* Logo header — site name + tag were removed; the logo stands alone.
            On mobile, an X close button is rendered here when the drawer is open. */}
        <header className="dash-side__top">
          <div className={`dash-side__brand ${isOpen ? '' : 'justify-center'}`}>
            <Logo className="h-8 w-8 shrink-0" />
          </div>
          {isMobile && isOpen && (
            <button
              type="button"
              className="dash-side__close"
              onClick={() => setIsOpen(false)}
              aria-label="بستن منو"
            >
              <HiOutlineXMark className="w-5 h-5" aria-hidden />
            </button>
          )}
        </header>

        {/* Scrollable nav */}
        <nav id="dash-side-nav" className="dash-side__nav" aria-label="ناوبری اصلی">
          <ul className="dash-side__list" role="list">
            {menuItems.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                isOpen={isOpen}
                isActive={isActiveRoute(item.href)}
                expandedItems={expandedItems}
                setExpandedItems={setExpandedItems}
                handleItemClick={handleItemClick}
              />
            ))}
          </ul>
        </nav>

        {/* Footer: user card + logout */}
        <footer className="dash-side__foot">
          {isOpen ? (
            <div className="dash-side__user-card">
              <Avatar
                imgUrl={userInfo?.image}
                userName={userInfo?.name}
                sizeClass="h-8 w-8"
                containerClassName="rounded-lg ring-2 ring-white/40 dark:ring-white/15"
              />
              <div className="dash-side__user-meta">
                <p className="dash-side__user-name">{userInfo?.name || 'کاربر'}</p>
                <p className="dash-side__user-email">{userInfo?.email}</p>
              </div>
            </div>
          ) : (
            <Avatar
              imgUrl={userInfo?.image}
              userName={userInfo?.name}
              sizeClass="h-8 w-8 mx-auto"
              containerClassName="rounded-lg"
            />
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="dash-side__item dash-side__logout"
            aria-label="خروج از حساب"
          >
            <span className="dash-side__item-ico">
              <HiOutlineArrowRightOnRectangle className="w-[18px] h-[18px]" aria-hidden />
            </span>
            {isOpen && <span className="dash-side__item-label">خروج</span>}
          </button>
        </footer>

        {/* Floating pill toggle — desktop only, appears on hover (Arc/Linear pattern) */}
        {!isMobile && (
          <button
            type="button"
            className="dash-side__pill"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
            aria-expanded={isOpen}
            aria-controls="dash-side-nav"
          >
            <HiOutlineChevronLeft className="w-4 h-4" aria-hidden />
          </button>
        )}
      </aside>

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <button
          type="button"
          className="dash-side__overlay"
          onClick={() => setIsOpen(false)}
          aria-label="بستن منو"
        />
      )}
    </>
  );
};

export default Sidebar;

// 2026-06-23: AuthResult fields are `message` for success and
// `error` for failure. Pick whichever is present.
function extractMessage(r: unknown): string | undefined {
  if (r && typeof r === 'object') {
    const record = r as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
  }
  return undefined;
}
