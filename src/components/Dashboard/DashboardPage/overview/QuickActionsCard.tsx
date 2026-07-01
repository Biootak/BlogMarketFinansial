'use client';

/**
 * QuickActionsCard — 2026 (July) Meridian Canvas.
 *
 * A harmonic quick-action surface that completes the equal-thirds row
 * alongside Calendar and SystemHealth. Shows the 4 most common actions
 * as premium icon buttons with Persian labels.
 *
 * Design: Fibonacci spacing (8/13/21), geometric accent line,
 * glassmorphic surface with layered depth.
 */

import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  HiOutlineArrowTrendingUp,
  HiOutlineChartBarSquare,
  HiOutlineCog6Tooth,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlineTag,
  HiOutlineUserGroup,
} from 'react-icons/hi2';

interface QuickActionsCardProps {
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
}

interface ActionItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  tone: 'indigo' | 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose';
  description: string;
}

const OWNER_ACTIONS: ActionItem[] = [
  {
    href: '/dashboard/posts/create',
    label: 'نوشتن پست',
    icon: <HiOutlinePencilSquare className="w-5 h-5" />,
    tone: 'indigo',
    description: 'پست جدید بنویسید',
  },
  {
    href: '/dashboard/exchange-rates',
    label: 'نرخ ارز',
    icon: <HiOutlineArrowTrendingUp className="w-5 h-5" />,
    tone: 'emerald',
    description: 'مدیریت نرخ‌ها',
  },
  {
    href: '/dashboard/users',
    label: 'کاربران',
    icon: <HiOutlineUserGroup className="w-5 h-5" />,
    tone: 'cyan',
    description: 'مدیریت کاربران',
  },
  {
    href: '/dashboard/settings',
    label: 'تنظیمات',
    icon: <HiOutlineCog6Tooth className="w-5 h-5" />,
    tone: 'violet',
    description: 'تنظیمات سیستم',
  },
];

const ADMIN_ACTIONS: ActionItem[] = [
  {
    href: '/dashboard/posts/create',
    label: 'نوشتن پست',
    icon: <HiOutlinePencilSquare className="w-5 h-5" />,
    tone: 'indigo',
    description: 'پست جدید بنویسید',
  },
  {
    href: '/dashboard/categories',
    label: 'دسته‌بندی‌ها',
    icon: <HiOutlineTag className="w-5 h-5" />,
    tone: 'emerald',
    description: 'مدیریت دسته‌ها',
  },
  {
    href: '/dashboard/posts',
    label: 'پست‌ها',
    icon: <HiOutlineDocumentText className="w-5 h-5" />,
    tone: 'cyan',
    description: 'همه پست‌ها',
  },
  {
    href: '/dashboard/reports',
    label: 'گزارش‌ها',
    icon: <HiOutlineChartBarSquare className="w-5 h-5" />,
    tone: 'violet',
    description: 'آمار و گزارش',
  },
];

const AUTHOR_ACTIONS: ActionItem[] = [
  {
    href: '/dashboard/posts/create',
    label: 'نوشتن پست',
    icon: <HiOutlinePencilSquare className="w-5 h-5" />,
    tone: 'indigo',
    description: 'پست جدید بنویسید',
  },
  {
    href: '/dashboard/posts',
    label: 'پست‌ها',
    icon: <HiOutlineDocumentText className="w-5 h-5" />,
    tone: 'cyan',
    description: 'پست‌های من',
  },
  {
    href: '/dashboard/categories',
    label: 'دسته‌بندی‌ها',
    icon: <HiOutlineTag className="w-5 h-5" />,
    tone: 'emerald',
    description: 'مشاهده دسته‌ها',
  },
  {
    href: '/dashboard/edit-profile',
    label: 'پروفایل',
    icon: <HiOutlinePhoto className="w-5 h-5" />,
    tone: 'violet',
    description: 'ویرایش پروفایل',
  },
];

const TONE_MAP: Record<ActionItem['tone'], string> = {
  indigo: 'dash-ico--indigo',
  emerald: 'dash-ico--emerald',
  cyan: 'dash-ico--cyan',
  violet: 'dash-ico--violet',
  amber: 'dash-ico--amber',
  rose: 'dash-ico--rose',
};

export default function QuickActionsCard({ userRole }: QuickActionsCardProps) {
  const actions =
    userRole === 'OWNER' ? OWNER_ACTIONS : userRole === 'ADMIN' ? ADMIN_ACTIONS : AUTHOR_ACTIONS;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="dash-pane dash-pane--tall"
      aria-label="دسترسی سریع"
    >
      <header className="dash-pane__head">
        <span className="dash-pane__title">
          <span className="dash-ico dash-ico--indigo w-10 h-10 shrink-0" aria-hidden>
            <HiOutlineCog6Tooth className="w-5 h-5" />
          </span>
          <span className="dash-pane__title-text">دسترسی سریع</span>
        </span>
      </header>

      <div className="dash-quick-grid">
        {actions.map((action, i) => (
          <motion.div
            key={action.href}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.35,
              delay: 0.06 * i,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link href={action.href} className="dash-quick-item group">
              <span className={cn('dash-quick-item__ico', TONE_MAP[action.tone])} aria-hidden>
                {action.icon}
              </span>
              <span className="dash-quick-item__body">
                <span className="dash-quick-item__label">{action.label}</span>
                <span className="dash-quick-item__desc">{action.description}</span>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Geometric accent — subtle diagonal line */}
      <div className="dash-quick-geo" aria-hidden />
    </motion.section>
  );
}
