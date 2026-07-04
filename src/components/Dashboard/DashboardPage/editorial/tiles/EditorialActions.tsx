'use client';

/**
 * EditorialActions — role-aware quick links.
 *
 * Compact list of primary destinations. Single muted icon + label.
 * No gradient pills, no rainbow tones — one accent (the foreground
 * color) carries the affordance.
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
}

const OWNER: Action[] = [
  { href: '/dashboard/posts/create', label: 'نوشتن پست', icon: <HiOutlinePencilSquare className="w-4 h-4" /> },
  { href: '/dashboard/exchange-rates', label: 'نرخ ارز', icon: <HiOutlineArrowTrendingUp className="w-4 h-4" /> },
  { href: '/dashboard/users', label: 'کاربران', icon: <HiOutlineUserGroup className="w-4 h-4" /> },
  { href: '/dashboard/settings', label: 'تنظیمات', icon: <HiOutlineCog6Tooth className="w-4 h-4" /> },
];

const ADMIN: Action[] = [
  { href: '/dashboard/posts/create', label: 'نوشتن پست', icon: <HiOutlinePencilSquare className="w-4 h-4" /> },
  { href: '/dashboard/categories', label: 'دسته‌بندی‌ها', icon: <HiOutlineTag className="w-4 h-4" /> },
  { href: '/dashboard/posts', label: 'پست‌ها', icon: <HiOutlineDocumentText className="w-4 h-4" /> },
  { href: '/dashboard/reports', label: 'گزارش‌ها', icon: <HiOutlineChartBarSquare className="w-4 h-4" /> },
];

const AUTHOR: Action[] = [
  { href: '/dashboard/posts/create', label: 'نوشتن پست', icon: <HiOutlinePencilSquare className="w-4 h-4" /> },
  { href: '/dashboard/posts', label: 'پست‌های من', icon: <HiOutlineDocumentText className="w-4 h-4" /> },
  { href: '/dashboard/categories', label: 'دسته‌بندی‌ها', icon: <HiOutlineSquares2X2 className="w-4 h-4" /> },
  { href: '/dashboard/edit-profile', label: 'پروفایل', icon: <HiOutlinePhoto className="w-4 h-4" /> },
];

interface EditorialActionsProps {
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
}

export default function EditorialActions({ userRole }: EditorialActionsProps) {
  const actions = userRole === 'OWNER' ? OWNER : userRole === 'ADMIN' ? ADMIN : AUTHOR;

  return (
    <section className="ec-tile ec-actions" aria-label="دسترسی سریع">
      <header className="ec-head">
        <div className="ec-head__title">
          <span className="ec-head__ico" aria-hidden>
            <HiOutlineBolt className="w-3.5 h-3.5" />
          </span>
          <div className="ec-head__text">
            <h2 className="ec-head__title-text">دسترسی سریع</h2>
            <p className="ec-head__sub">{actions.length.toLocaleString('fa-IR')} مقصد</p>
          </div>
        </div>
      </header>

      <ul className="ec-actions__list">
        {actions.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="ec-action">
              <span className="ec-action__ico" aria-hidden>
                {a.icon}
              </span>
              <span className="ec-action__label">{a.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
