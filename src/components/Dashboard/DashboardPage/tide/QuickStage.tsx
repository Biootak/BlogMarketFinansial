'use client';

/**
 * QuickStage — TIDE 2026 (July 1) primary action stage.
 *
 * A 4-up grid of "primary action modules". Each module is a card with
 *   • A 12px label tag (e.g. "۰۱ · نوشتن")
 *   • A bold headline (Persian label)
 *   • A 1-line description
 *   • An embedded mini-stat or hint
 *   • A persistent chevron
 *
 * On hover the card "lifts" with a 6px shadow grow and the chevron
 * translates 4px. Reduced-motion collapses the lift to a border-color
 * change so the user still gets feedback.
 *
 * The grid is asymmetric on desktop: 2 columns × 2 rows of equal height
 * with a 4px gap. On tablet it collapses to 2 cols. On mobile it goes
 * single column with stacked modules.
 */

import { Spotlight } from '@/components/Dashboard/primitives';
import { motion } from '@/lib/motion-shim';
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
  HiOutlineTag,
  HiOutlineUserGroup,
} from 'react-icons/hi2';

interface QuickStageProps {
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
}

interface ActionItem {
  href: string;
  index: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  tone: 'indigo' | 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose';
  meta: string;
}

const OWNER_ACTIONS: ActionItem[] = [
  {
    href: '/dashboard/posts/create',
    index: '۰۱',
    label: 'نوشتن پست',
    description: 'پست تازه منتشر کنید',
    icon: <HiOutlinePencilSquare className="w-5 h-5" />,
    tone: 'indigo',
    meta: 'شروع سریع با ⌘N',
  },
  {
    href: '/dashboard/exchange-rates',
    index: '۰۲',
    label: 'نرخ ارز',
    description: 'مدیریت نرخ‌های بازار',
    icon: <HiOutlineArrowTrendingUp className="w-5 h-5" />,
    tone: 'emerald',
    meta: 'به‌روزرسانی هر ۱۰ دقیقه',
  },
  {
    href: '/dashboard/users',
    index: '۰۳',
    label: 'کاربران',
    description: 'مدیریت اعضای تیم',
    icon: <HiOutlineUserGroup className="w-5 h-5" />,
    tone: 'cyan',
    meta: 'نقش‌ها و دسترسی‌ها',
  },
  {
    href: '/dashboard/settings',
    index: '۰۴',
    label: 'تنظیمات',
    description: 'تنظیمات سیستم و برند',
    icon: <HiOutlineCog6Tooth className="w-5 h-5" />,
    tone: 'violet',
    meta: 'پیکربندی پیشرفته',
  },
];

const ADMIN_ACTIONS: ActionItem[] = [
  {
    href: '/dashboard/posts/create',
    index: '۰۱',
    label: 'نوشتن پست',
    description: 'پست تازه منتشر کنید',
    icon: <HiOutlinePencilSquare className="w-5 h-5" />,
    tone: 'indigo',
    meta: 'شروع سریع با ⌘N',
  },
  {
    href: '/dashboard/categories',
    index: '۰۲',
    label: 'دسته‌بندی‌ها',
    description: 'ساختار دسته‌ها',
    icon: <HiOutlineTag className="w-5 h-5" />,
    tone: 'emerald',
    meta: 'سازماندهی محتوا',
  },
  {
    href: '/dashboard/posts',
    index: '۰۳',
    label: 'پست‌ها',
    description: 'همه‌ی پست‌ها',
    icon: <HiOutlineDocumentText className="w-5 h-5" />,
    tone: 'cyan',
    meta: 'فیلتر، ویرایش، انتشار',
  },
  {
    href: '/dashboard/reports',
    index: '۰۴',
    label: 'گزارش‌ها',
    description: 'آمار و گزارش‌های جامع',
    icon: <HiOutlineChartBarSquare className="w-5 h-5" />,
    tone: 'violet',
    meta: 'تحلیل عملکرد',
  },
];

const AUTHOR_ACTIONS: ActionItem[] = [
  {
    href: '/dashboard/posts/create',
    index: '۰۱',
    label: 'نوشتن پست',
    description: 'پست تازه منتشر کنید',
    icon: <HiOutlinePencilSquare className="w-5 h-5" />,
    tone: 'indigo',
    meta: 'شروع سریع با ⌘N',
  },
  {
    href: '/dashboard/posts',
    index: '۰۲',
    label: 'پست‌های من',
    description: 'همه‌ی پست‌های شما',
    icon: <HiOutlineDocumentText className="w-5 h-5" />,
    tone: 'cyan',
    meta: 'پیش‌نویس و منتشر شده',
  },
  {
    href: '/dashboard/categories',
    index: '۰۳',
    label: 'دسته‌بندی‌ها',
    description: 'دسته‌های موجود',
    icon: <HiOutlineTag className="w-5 h-5" />,
    tone: 'emerald',
    meta: 'مرور دسته‌ها',
  },
  {
    href: '/dashboard/edit-profile',
    index: '۰۴',
    label: 'پروفایل',
    description: 'ویرایش پروفایل',
    icon: <HiOutlinePhoto className="w-5 h-5" />,
    tone: 'violet',
    meta: 'تصویر و اطلاعات',
  },
];

const TONE_MAP: Record<ActionItem['tone'], string> = {
  indigo: 'is-indigo',
  emerald: 'is-emerald',
  cyan: 'is-cyan',
  violet: 'is-violet',
  amber: 'is-amber',
  rose: 'is-rose',
};

export default function QuickStage({ userRole }: QuickStageProps) {
  const actions =
    userRole === 'OWNER' ? OWNER_ACTIONS : userRole === 'ADMIN' ? ADMIN_ACTIONS : AUTHOR_ACTIONS;

  return (
    <section className="tide-stage" aria-label="دسترسی سریع">
      <header className="tide-stage__head">
        <div className="tide-stage__head-meta">
          <span className="tide-stage__head-tag">۰۲ · دسترسی سریع</span>
          <h2 className="tide-stage__head-title">اقدام‌های پرکاربرد</h2>
        </div>
        <p className="tide-stage__head-sub">چهار عملیات اصلی برای شروع کار — هر کدام با یک کلیک.</p>
      </header>

      <ul className="tide-stage__grid">
        {actions.map((action, i) => (
          <motion.li
            key={action.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay: 0.1 + i * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link href={action.href} className={cn('tide-module', TONE_MAP[action.tone])}>
              <Spotlight tone={action.tone} size={260} />
              <span className="tide-module__index" aria-hidden>
                {action.index}
              </span>
              <span className="tide-module__ico" aria-hidden>
                {action.icon}
              </span>
              <span className="tide-module__body">
                <span className="tide-module__label">{action.label}</span>
                <span className="tide-module__desc">{action.description}</span>
                <span className="tide-module__meta">{action.meta}</span>
              </span>
              <span className="tide-module__cta" aria-hidden>
                <HiOutlineArrowLeft className="w-4 h-4" />
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
