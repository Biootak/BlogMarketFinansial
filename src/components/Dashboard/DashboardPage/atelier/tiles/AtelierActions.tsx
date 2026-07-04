'use client';

/**
 * AtelierActions — role-aware quick links.
 *
 * Renders the primary destinations for the current user role. Each
 * action is a "pressable" card with a hairline border, a glyph icon,
 * a short label, and a tiny chevron that fades in on hover. The
 * primary action (نوشتن پست) is always rendered first and gets an
 * emerald tint.
 */

import Link from 'next/link';
import {
  HiOutlineArrowTrendingUp,
  HiOutlineChartBarSquare,
  HiOutlineCog6Tooth,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlineSquares2X2,
  HiOutlineTag,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import { HiOutlineBolt } from 'react-icons/hi2';

interface Action {
  href: string;
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
}

const OWNER: Action[] = [
  {
    href: '/dashboard/posts/create',
    label: 'نوشتن پست',
    icon: <HiOutlinePencilSquare className="w-4 h-4" />,
    primary: true,
  },
  { href: '/dashboard/exchange-rates', label: 'نرخ ارز', icon: <HiOutlineArrowTrendingUp className="w-4 h-4" /> },
  { href: '/dashboard/users', label: 'کاربران', icon: <HiOutlineUserGroup className="w-4 h-4" /> },
  { href: '/dashboard/settings', label: 'تنظیمات', icon: <HiOutlineCog6Tooth className="w-4 h-4" /> },
];

const ADMIN: Action[] = [
  {
    href: '/dashboard/posts/create',
    label: 'نوشتن پست',
    icon: <HiOutlinePencilSquare className="w-4 h-4" />,
    primary: true,
  },
  { href: '/dashboard/categories', label: 'دسته‌بندی‌ها', icon: <HiOutlineTag className="w-4 h-4" /> },
  { href: '/dashboard/posts', label: 'پست‌ها', icon: <HiOutlineDocumentText className="w-4 h-4" /> },
  { href: '/dashboard/reports', label: 'گزارش‌ها', icon: <HiOutlineChartBarSquare className="w-4 h-4" /> },
];

const AUTHOR: Action[] = [
  {
    href: '/dashboard/posts/create',
    label: 'نوشتن پست',
    icon: <HiOutlinePencilSquare className="w-4 h-4" />,
    primary: true,
  },
  { href: '/dashboard/posts', label: 'پست‌های من', icon: <HiOutlineDocumentText className="w-4 h-4" /> },
  { href: '/dashboard/categories', label: 'دسته‌بندی‌ها', icon: <HiOutlineSquares2X2 className="w-4 h-4" /> },
  { href: '/dashboard/edit-profile', label: 'پروفایل', icon: <HiOutlinePhoto className="w-4 h-4" /> },
];

interface AtelierActionsProps {
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
}

export default function AtelierActions({ userRole }: AtelierActionsProps) {
  const actions = userRole === 'OWNER' ? OWNER : userRole === 'ADMIN' ? ADMIN : AUTHOR;

  return (
    <section className="at-tile at-actions" aria-label="دسترسی سریع">
      <header className="at-head">
        <div className="at-head__title">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineBolt className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">دسترسی سریع</h2>
            <p className="at-head__sub">
              {actions.length.toLocaleString('fa-IR')} مقصد
            </p>
          </div>
        </div>
      </header>

      <ul className="at-actions__list">
        {actions.map((a) => (
          <li key={a.href}>
            <Link
              href={a.href}
              className={`at-action ${a.primary ? 'is-primary' : ''}`}
            >
              <span className="at-action__ico" aria-hidden>
                {a.icon}
              </span>
              <span className="at-action__label">{a.label}</span>
              <span className="at-action__chev" aria-hidden>
                ‹
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
