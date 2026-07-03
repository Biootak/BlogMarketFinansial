'use client';

/**
 * ActionsTile — NOVA quick-actions tile.
 *
 * Role-aware list of primary actions rendered as compact rows with a
 * hover-reveal chevron. Same destinations as the TIDE QuickStage, but a
 * denser, single-tile layout that fits the bento rhythm.
 */

import { Spotlight } from '@/components/Dashboard/primitives';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  HiOutlineArrowLeft,
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

type Tone = 'primary' | 'emerald' | 'cyan' | 'violet' | 'amber';

interface Action {
  href: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: Tone;
}

const OWNER: Action[] = [
  { href: '/dashboard/posts/create', label: 'نوشتن پست', hint: 'انتشار محتوای تازه', icon: <HiOutlinePencilSquare className="w-4 h-4" />, tone: 'primary' },
  { href: '/dashboard/exchange-rates', label: 'نرخ ارز', hint: 'مدیریت نرخ بازار', icon: <HiOutlineArrowTrendingUp className="w-4 h-4" />, tone: 'emerald' },
  { href: '/dashboard/users', label: 'کاربران', hint: 'اعضای تیم و نقش‌ها', icon: <HiOutlineUserGroup className="w-4 h-4" />, tone: 'cyan' },
  { href: '/dashboard/settings', label: 'تنظیمات', hint: 'پیکربندی سیستم', icon: <HiOutlineCog6Tooth className="w-4 h-4" />, tone: 'violet' },
];

const ADMIN: Action[] = [
  { href: '/dashboard/posts/create', label: 'نوشتن پست', hint: 'انتشار محتوای تازه', icon: <HiOutlinePencilSquare className="w-4 h-4" />, tone: 'primary' },
  { href: '/dashboard/categories', label: 'دسته‌بندی‌ها', hint: 'ساختار دسته‌ها', icon: <HiOutlineTag className="w-4 h-4" />, tone: 'emerald' },
  { href: '/dashboard/posts', label: 'پست‌ها', hint: 'فیلتر و انتشار', icon: <HiOutlineDocumentText className="w-4 h-4" />, tone: 'cyan' },
  { href: '/dashboard/reports', label: 'گزارش‌ها', hint: 'تحلیل عملکرد', icon: <HiOutlineChartBarSquare className="w-4 h-4" />, tone: 'violet' },
];

const AUTHOR: Action[] = [
  { href: '/dashboard/posts/create', label: 'نوشتن پست', hint: 'انتشار محتوای تازه', icon: <HiOutlinePencilSquare className="w-4 h-4" />, tone: 'primary' },
  { href: '/dashboard/posts', label: 'پست‌های من', hint: 'پیش‌نویس و منتشرشده', icon: <HiOutlineDocumentText className="w-4 h-4" />, tone: 'cyan' },
  { href: '/dashboard/categories', label: 'دسته‌بندی‌ها', hint: 'مرور دسته‌ها', icon: <HiOutlineTag className="w-4 h-4" />, tone: 'emerald' },
  { href: '/dashboard/edit-profile', label: 'پروفایل', hint: 'تصویر و اطلاعات', icon: <HiOutlinePhoto className="w-4 h-4" />, tone: 'violet' },
];

interface ActionsTileProps {
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
}

export default function ActionsTile({ userRole }: ActionsTileProps) {
  const actions = userRole === 'OWNER' ? OWNER : userRole === 'ADMIN' ? ADMIN : AUTHOR;

  return (
    <section className="nova-tile nova-tile--actions" data-tone="violet" aria-label="دسترسی سریع">
      <Spotlight tone="violet" size={280} />
      <header className="nova-panel__head nova-panel__head--tight">
        <div className="nova-panel__head-title">
          <span className="nova-panel__head-ico" aria-hidden>
            <HiOutlineSquares2X2 className="w-4 h-4" />
          </span>
          <h2 className="nova-panel__title">دسترسی سریع</h2>
        </div>
      </header>

      <ul className="nova-actions__list">
        {actions.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className={cn('nova-action', `nova-action--${a.tone}`)}>
              <span className="nova-action__ico" aria-hidden>
                {a.icon}
              </span>
              <span className="nova-action__body">
                <span className="nova-action__label">{a.label}</span>
                <span className="nova-action__hint">{a.hint}</span>
              </span>
              <span className="nova-action__cta" aria-hidden>
                <HiOutlineArrowLeft className="w-4 h-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
