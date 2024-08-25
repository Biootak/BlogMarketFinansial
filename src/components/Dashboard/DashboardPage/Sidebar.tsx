'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HiOutlineChartBar,
  HiOutlineDocumentText,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineTag,
  HiOutlineUserGroup,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';

interface MenuItem {
  href: string;
  icon: React.ReactNode;
  pageName: string;
}

const menuItems: MenuItem[] = [
  {
    href: '/dashboard/admin',
    icon: <HiOutlineChartBar className="w-5 h-5" />,
    pageName: 'داشبورد',
  },
  {
    href: '/dashboard/admin/posts',
    icon: <HiOutlineDocumentText className="w-5 h-5" />,
    pageName: 'پست ها',
  },
  {
    href: '/dashboard/admin/advertisements',
    icon: <HiOutlineChatBubbleLeftEllipsis className="w-5 h-5" />,
    pageName: 'تبلیغات',
  },
  {
    href: '/dashboard/admin/categories',
    icon: <HiOutlineTag className="w-5 h-5" />,
    pageName: 'دسته‌بندی‌ها',
  },
  {
    href: '/dashboard/admin/users',
    icon: <HiOutlineUserGroup className="w-5 h-5" />,
    pageName: 'کاربران',
  },
];

const managementItems: MenuItem[] = [
  {
    href: '/dashboard/settings',
    icon: <HiOutlineCog6Tooth className="w-5 h-5" />,
    pageName: 'تنظیمات',
  },
  {
    href: '/dashboard/profile',
    icon: <HiOutlineUserGroup className="w-5 h-5" />,
    pageName: 'پروفایل',
  },
];

const SidebarItem: React.FC<MenuItem> = ({ href, icon, pageName }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <li>
      <Link
        className={`px-4 py-2 rounded-lg flex items-center transition-all ${
          isActive
            ? 'bg-indigo-100 text-indigo-700 font-semibold shadow-sm'
            : 'text-gray-700 hover:bg-gray-100 hover:text-indigo-600'
        }`}
        href={href}
      >
        <span
          className={`ml-3 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}
        >
          {icon}
        </span>
        <span className="text-sm">{pageName}</span>
      </Link>
    </li>
  );
};

const Sidebar: React.FC = () => {
  return (
    <aside className="hidden md:flex w-64 bg-white dark:bg-gray-800 shadow-xl flex-col">
      <div className="p-4 border-b dark:border-gray-700">
        <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">داشبورد وبلاگ</h1>
      </div>
      <div className="p-4 flex-grow overflow-y-auto">
        <nav>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">
            مدیریت محتوا
          </h2>
          <ul className="space-y-1 mb-6">
            {menuItems.map((item, index) => (
              <SidebarItem key={index} {...item} />
            ))}
          </ul>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">تنظیمات</h2>
          <ul className="space-y-1">
            {managementItems.map((item, index) => (
              <SidebarItem key={index} {...item} />
            ))}
          </ul>
        </nav>
      </div>
      <div className="p-4 border-t dark:border-gray-700">
        <button
          type="button"
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center shadow-sm"
        >
          <HiOutlineArrowRightOnRectangle className="w-5 h-5 ml-2" />
          خروج
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
