/**
 * ExchangeQuickActions — 4 magnetic CTA cards for common workflows.
 *
 * Server Component. link-only, no client logic.
 */

import s from './ExchangeDashboard.module.css';
import Link from 'next/link';
import { UserPlus, ArrowLeftRight, ClipboardList, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ActionItem {
  label: string;
  desc: string;
  href: string;
  Icon: LucideIcon;
}

const ACTIONS: ActionItem[] = [
  {
    label: 'افزودن مشتری',
    desc: 'ثبت مشتری جدید و شروع احراز هویت',
    href: '/exchange/customers/new',
    Icon: UserPlus,
  },
  {
    label: 'ثبت تراکنش',
    desc: 'واریز، برداشت یا صرافی جدید',
    href: '/exchange/transactions/new',
    Icon: ArrowLeftRight,
  },
  {
    label: 'بررسی در انتظارها',
    desc: 'لیست تراکنش‌های نیازمند تأیید',
    href: '/exchange/transactions?status=PENDING',
    Icon: ClipboardList,
  },
  {
    label: 'صورت‌حساب',
    desc: 'گزارش مالی و تسویهٔ دوره',
    href: '/exchange/reports',
    Icon: Receipt,
  },
];

export default function ExchangeQuickActions() {
  return (
    <nav className={s.actionsGrid} aria-label="اقدام‌های پرکاربرد">
      {ACTIONS.map(({ label, desc, href, Icon }) => (
        <Link key={href} href={href} className={s.actionCard} aria-label={label}>
          <span className={s.actionIcon} aria-hidden>
            <Icon size={16} strokeWidth={1.75} />
          </span>
          <span>
            <span className={s.actionLabel} style={{ display: 'block' }}>
              {label}
            </span>
            <span className={s.actionDesc} style={{ display: 'block' }}>
              {desc}
            </span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
