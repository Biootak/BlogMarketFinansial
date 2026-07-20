'use client';

/**
 * AtelierActions — role-aware quick access (2026-07-04 redesign).
 *
 * Visual identity:
 *   • چیدمان ۲×۲ به جای لیست عمودی — سریع‌ترین پیدا کردن مقصد.
 *   • Primary action (نوشتن پست) به جای اول لیست، در جایگاه ویژه:
 *     یه کارت «hero» بزرگ‌تر که ۲-ستون عرض می‌گیرد و emerald gradient
 *     با طلایی streak دارد.
 *   • سایر actions به صورت card های کوچک با hairline border، icon
 *     در یک مربع ۳۶×۳۶، label، hotkey hint در گوشه (مثلاً `G P`
 *     برای «نوشتن پست جدید»).
 *   • Hover: lift 1px + border-color تقویت + chevron فید این.
 *   • موبایل: همچنان ۲ ستون (cards کوچک‌تر می‌شوند).
 *
 * دلیل مکان (ردیف ۲، بلافاصله بعد از Hero):
 *   2026-07-04 شب — ادغام «دسترسی سریع» در پیشخوان. کاربر به محض
 *   ورود به پیشخوان باید اولین کاشی عملیاتی را ببیند: «نوشتن پست /
 *   نرخ ارز / کاربران / تنظیمات». قبلاً در ردیف ۴ (بعد از Week
 *   Rhythm) بود و کاربر باید scroll می‌کرد تا به آن برسد؛ حالا
 *   اولین چیز بعد از سلام و احوالپرسی Hero است. flow:
 *   greet → act → engage → plan → analyze.
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

interface Action {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Hotkey hint shown as a small kbd chip; null = نمایش داده نمی‌شود. */
  hotkey?: string;
  /** Meta line optional, e.g. «۱۲ در انتظار». */
  meta?: string;
}

const OWNER: Action[] = [
  {
    href: '/dashboard/posts/create',
    label: 'نوشتن پست',
    icon: <HiOutlinePencilSquare className="w-4 h-4" />,
    hotkey: 'G P',
    meta: 'اقدام اصلی',
  },
  {
    href: '/dashboard/exchange-rates',
    label: 'نرخ ارز',
    icon: <HiOutlineArrowTrendingUp className="w-4 h-4" />,
    hotkey: 'G E',
  },
  {
    href: '/dashboard/users',
    label: 'کاربران',
    icon: <HiOutlineUserGroup className="w-4 h-4" />,
    hotkey: 'G U',
  },
  {
    href: '/dashboard/settings',
    label: 'تنظیمات',
    icon: <HiOutlineCog6Tooth className="w-4 h-4" />,
    hotkey: 'G S',
  },
];

const ADMIN: Action[] = [
  {
    href: '/dashboard/posts/create',
    label: 'نوشتن پست',
    icon: <HiOutlinePencilSquare className="w-4 h-4" />,
    hotkey: 'G P',
    meta: 'اقدام اصلی',
  },
  {
    href: '/dashboard/categories',
    label: 'دسته‌بندی‌ها',
    icon: <HiOutlineTag className="w-4 h-4" />,
    hotkey: 'G C',
  },
  {
    href: '/dashboard/posts',
    label: 'پست‌ها',
    icon: <HiOutlineDocumentText className="w-4 h-4" />,
    hotkey: 'G L',
  },
  {
    href: '/dashboard/reports',
    label: 'گزارش‌ها',
    icon: <HiOutlineChartBarSquare className="w-4 h-4" />,
    hotkey: 'G R',
  },
];

const AUTHOR: Action[] = [
  {
    href: '/dashboard/posts/create',
    label: 'نوشتن پست',
    icon: <HiOutlinePencilSquare className="w-4 h-4" />,
    hotkey: 'G P',
    meta: 'اقدام اصلی',
  },
  {
    href: '/dashboard/posts',
    label: 'پست‌های من',
    icon: <HiOutlineDocumentText className="w-4 h-4" />,
    hotkey: 'G L',
  },
  {
    href: '/dashboard/categories',
    label: 'دسته‌بندی‌ها',
    icon: <HiOutlineSquares2X2 className="w-4 h-4" />,
  },
  {
    href: '/dashboard/edit-profile',
    label: 'پروفایل',
    icon: <HiOutlinePhoto className="w-4 h-4" />,
  },
];

interface AtelierActionsProps {
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
}

export default function AtelierActions({ userRole }: AtelierActionsProps) {
  const actions = userRole === 'OWNER' ? OWNER : userRole === 'ADMIN' ? ADMIN : AUTHOR;
  const primary = actions[0]!;
  const rest = actions.slice(1);

  return (
    <section className="at-tile at-actions" aria-label="دسترسی سریع">
      <header className="at-head">
        <div className="at-head__title">
          <span className="at-head__ico" aria-hidden>
            <HiOutlinePencilSquare className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">دسترسی سریع</h2>
            <p className="at-head__sub">میان‌برهای پرکاربرد</p>
          </div>
        </div>
      </header>

      <div className="at-actions__grid">
        {/* Primary — ستون‌های ۱-۲ (full width) */}
        <Link
          href={primary.href}
          className="at-action at-action--hero is-primary"
          aria-label={primary.label}
        >
          <span className="at-action__hero-row">
            <span className="at-action__hero-ico" aria-hidden>
              {primary.icon}
            </span>
            {primary.hotkey && (
              <span className="at-action__kbd" aria-hidden>
                {primary.hotkey}
              </span>
            )}
          </span>
          <span className="at-action__hero-body">
            <span className="at-action__hero-label">{primary.label}</span>
            {primary.meta && <span className="at-action__hero-meta">{primary.meta}</span>}
          </span>
          <span className="at-action__hero-arrow" aria-hidden>
            ‹
          </span>
        </Link>

        {/* Secondary — هر کدام یک column-1-of-3 (تعداد = 3 یا کمتر) */}
        {rest.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="at-action at-action--card"
            aria-label={a.label}
          >
            <span className="at-action__ico" aria-hidden>
              {a.icon}
            </span>
            <span className="at-action__body">
              <span className="at-action__label">{a.label}</span>
              {a.meta && <span className="at-action__meta">{a.meta}</span>}
            </span>
            {a.hotkey && (
              <span className="at-action__kbd" aria-hidden>
                {a.hotkey}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
