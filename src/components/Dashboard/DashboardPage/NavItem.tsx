'use client';

/**
 * NavItem.tsx — Single navigation item for the Dashboard Sidebar.
 * Extracted from Sidebar.tsx to keep the main component under 400 lines.
 * Handles both plain links and collapsible submenu parents.
 */

import { NotificationBadge } from '@/components/Dashboard/DashboardPage/NotificationBadge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HiOutlineChevronDown } from 'react-icons/hi2';
import type { MenuItem } from './sidebar-menu';

function toPersianDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export interface NavItemProps {
  item: MenuItem;
  index: number;
  isOpen: boolean;
  isActive: boolean;
  expandedItems: string[];
  setExpandedItems: React.Dispatch<React.SetStateAction<string[]>>;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  item,
  index,
  isOpen,
  isActive,
  expandedItems,
  setExpandedItems,
  onClick,
}) => {
  const pathname = usePathname();
  const isExpanded = expandedItems.includes(item.id);

  if (item.submenu) {
    const isSubActive = item.submenu.some((s) => pathname === s.href);
    return (
      <li className="dash-side__row">
        <button
          type="button"
          className={cn('dash-side__item', 'dash-side__item--parent')}
          data-active={isSubActive || undefined}
          data-expanded={isExpanded || undefined}
          aria-expanded={isExpanded}
          aria-controls={`dash-side-sub-${item.id}`}
          onClick={() =>
            setExpandedItems((p) =>
              p.includes(item.id) ? p.filter((x) => x !== item.id) : [...p, item.id],
            )
          }
        >
          <span className="dash-side__diamond" aria-hidden />
          <span className="dash-side__index" aria-hidden>
            {toPersianDigits(index)}
          </span>
          <span className="dash-side__item-ico">{item.icon}</span>
          <span className="dash-side__item-label">{item.label}</span>
          {item.shortcut && isOpen && (
            <kbd className="dash-side__item-kbd" aria-hidden>
              {item.shortcut}
            </kbd>
          )}
          <HiOutlineChevronDown className="dash-side__item-chev" aria-hidden />
        </button>
        <div
          id={`dash-side-sub-${item.id}`}
          className="dash-side__sub"
          data-open={isExpanded || undefined}
        >
          <div className="dash-side__sub-inner">
            {item.submenu.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={onClick}
                className="dash-side__item dash-side__item--sub"
                data-active={pathname === sub.href || undefined}
                aria-current={pathname === sub.href ? 'page' : undefined}
              >
                <span className="dash-side__item-tick" aria-hidden />
                <span className="dash-side__item-label">{sub.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="dash-side__row">
      <Link
        href={item.href}
        onClick={onClick}
        className="dash-side__item"
        data-active={isActive || undefined}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="dash-side__diamond" aria-hidden />
        <span className="dash-side__index" aria-hidden>
          {toPersianDigits(index)}
        </span>
        <span className="dash-side__item-ico">{item.icon}</span>
        <span className="dash-side__item-label">{item.label}</span>
        {item.id === 'notifications' && <NotificationBadge />}
        {item.shortcut && isOpen && (
          <kbd className="dash-side__item-kbd" aria-hidden>
            {item.shortcut}
          </kbd>
        )}
      </Link>
    </li>
  );
};

export default NavItem;
