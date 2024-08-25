import { memo, useMemo } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

type NavItem = Readonly<{
  id: string;
  href: string;
  name: string;
}>;

type NavigationProps = Readonly<{
  className?: string;
  linkClassName?: string;
}>;

const Navigation = ({ className = 'flex', linkClassName }: NavigationProps): JSX.Element => {
  const NAVBAR_LINKS = useMemo(
    () =>
      [
        {
          id: '0',
          href: '/',
          name: 'صفحه اصلی',
        },
        {
          id: '1',
          href: '/archive',
          name: 'وبلاگ',
        },
        {
          id: '2',
          href: '/market',
          name: 'مارکت',
        },
        {
          id: '3',
          href: '/about',
          name: 'درباره ما',
        },
        {
          id: '4',
          href: '/contact',
          name: 'تماس با ما',
        },
      ] as const,
    [],
  );

  const renderNavItem = (item: NavItem) => (
    <li key={item.id}>
      <Link
        href={item.href}
        className={clsx(
          'block py-2 px-4 transition-colors duration-200',
          'hover:text-primary-600 hover:bg-gray-100 font-medium rounded-md dark:text-slate-300 dark:hover:bg-slate-800',
          linkClassName,
        )}
      >
        {item.name}
      </Link>
    </li>
  );

  return (
    <nav className="flex items-center justify-center">
      <ul className={clsx('nc-Navigation items-center', className)}>
        {NAVBAR_LINKS.map(renderNavItem)}
      </ul>
    </nav>
  );
};

export default memo(Navigation);
