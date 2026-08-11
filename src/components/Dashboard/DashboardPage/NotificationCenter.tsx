'use client';

/**
 * NotificationCenter — unified notification bell + dropdown for ALL dashboards.
 *
 * Shows a bell icon with badge count. Click opens a dropdown with:
 *   - Recent notifications (grouped by type)
 *   - Mark all as read
 *   - View all link
 *
 * Usage in any layout:
 *   <NotificationCenter portal="admin" />
 *   <NotificationCenter portal="exchange" />
 *   <NotificationCenter portal="customer" />
 */

import { AnimatePresence, motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import { Bell, Check, CheckCheck, ChevronLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import s from './NotificationCenter.module.css';

// ─── Types ──────────────────────────────────────────────────────────────

export type NotificationTone = 'info' | 'success' | 'warning' | 'danger';
export type PortalType = 'admin' | 'exchange' | 'customer';

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  tone: NotificationTone;
  timestamp: string | Date;
  read: boolean;
  href?: string;
  actionLabel?: string;
  action?: () => void;
}

interface NotificationCenterProps {
  portal: PortalType;
  /** Custom notifications — if not provided, uses demo data */
  notifications?: NotificationItem[];
  /** "View all" link */
  viewAllHref?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

const _faNum = new Intl.NumberFormat('fa-IR');

function faNum(n: number): string {
  return _faNum.format(n);
}

function formatRelative(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'هم‌اکنون';
  if (diffMin < 60) return `${diffMin} دقیقه پیش`;
  if (diffH < 24) return `${diffH} ساعت پیش`;
  if (diffD < 7) return `${diffD} روز پیش`;
  return date.toLocaleDateString('fa-IR');
}

function toneIcon(tone: NotificationTone): ReactNode {
  switch (tone) {
    case 'success':
      return <Check size={12} />;
    case 'warning':
      return <Bell size={12} />;
    case 'danger':
      return <Bell size={12} />;
    default:
      return <Bell size={12} />;
  }
}

// ─── Demo data (for portals without real API yet) ───────────────────────

function getDemoNotifications(portal: PortalType): NotificationItem[] {
  const now = Date.now();
  switch (portal) {
    case 'exchange':
      return [
        {
          id: 'e1',
          title: 'درخواست فوری جدید',
          description: 'مشتری احمدی درخواست فوری ثبت کرده',
          tone: 'danger',
          timestamp: new Date(now - 5 * 60_000),
          read: false,
          href: '/exchange/transactions?status=PENDING',
          actionLabel: 'بررسی',
        },
        {
          id: 'e2',
          title: 'نرخ USD به‌روز شد',
          description: 'نرخ خرید: ۹۲.۵۰۰ — نرخ فروش: ۹۳.۰۰۰',
          tone: 'info',
          timestamp: new Date(now - 30 * 60_000),
          read: false,
          href: '/exchange/rates',
        },
        {
          id: 'e3',
          title: 'تراکنش تأیید شد',
          description: 'واریز ۵۰,۰۰۰ AFN توسط رضایی',
          tone: 'success',
          timestamp: new Date(now - 2 * 3600_000),
          read: true,
          href: '/exchange/transactions',
        },
      ];

    case 'customer':
      return [
        {
          id: 'c1',
          title: 'تراکنش شما تأیید شد',
          description: 'واریز ۱۰,۰۰۰ AFN به حساب شما',
          tone: 'success',
          timestamp: new Date(now - 10 * 60_000),
          read: false,
          href: '/customer/transactions',
          actionLabel: 'مشاهده',
        },
        {
          id: 'c2',
          title: 'احراز هویت در حال بررسی',
          description: 'مدارک شما در حال بررسی توسط صراف است',
          tone: 'warning',
          timestamp: new Date(now - 1 * 3600_000),
          read: false,
          href: '/customer/kyc',
        },
        {
          id: 'c3',
          title: 'نرخ جدید منتشر شد',
          description: 'نرخ EUR امروز به‌روز شد',
          tone: 'info',
          timestamp: new Date(now - 3 * 3600_000),
          read: true,
          href: '/customer/wallet',
        },
      ];

    default:
      return [
        {
          id: 'a1',
          title: 'درخواست خدمات جدید',
          description: 'تیکت #۱۲۳ — اولویت بالا',
          tone: 'danger',
          timestamp: new Date(now - 2 * 60_000),
          read: false,
          href: '/dashboard/service-requests',
          actionLabel: 'بررسی',
        },
        {
          id: 'a2',
          title: 'نرخ ارز به‌روز شد',
          description: '۵ نرخ جدید توسط cron اضافه شد',
          tone: 'info',
          timestamp: new Date(now - 15 * 60_000),
          read: false,
          href: '/dashboard/exchange-rates',
        },
        {
          id: 'a3',
          title: 'پست جدید منتشر شد',
          description: '«راهنمای استفاده از صرافی» منتشر شد',
          tone: 'success',
          timestamp: new Date(now - 1 * 3600_000),
          read: true,
          href: '/dashboard/posts',
        },
        {
          id: 'a4',
          title: 'کاربر جدید ثبت‌نام کرد',
          description: 'محمد از کابل',
          tone: 'info',
          timestamp: new Date(now - 2 * 3600_000),
          read: true,
          href: '/dashboard/customers',
        },
      ];
  }
}

// ─── Component ──────────────────────────────────────────────────────────

export default function NotificationCenter({
  portal,
  notifications,
  viewAllHref,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(
    () => notifications ?? getDemoNotifications(portal),
  );
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.read).length;

  // Default view-all link
  const defaultHref =
    portal === 'exchange'
      ? '/exchange/notifications'
      : portal === 'customer'
        ? '/customer/notifications'
        : '/dashboard/notifications';

  // Mark as read
  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        setOpen(false);
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className={s.root}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={s.bell}
        aria-label={`اعلان‌ها — ${unreadCount > 0 ? `${faNum(unreadCount)} خوانده نشده` : 'همه خوانده شده'}`}
        aria-expanded={open}
      >
        <Bell size={16} className={s.bellIcon} />
        {unreadCount > 0 && (
          <span className={s.badge} aria-hidden>
            {unreadCount > 99 ? '۹۹+' : faNum(unreadCount)}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.12 }}
            className={s.dropdown}
            role="menu"
            aria-label="اعلان‌ها"
          >
            {/* Header */}
            <div className={s.header}>
              <span className={s.headerTitle}>اعلان‌ها</span>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllRead} className={s.markAll}>
                  <CheckCheck size={11} />
                  <span>خواندن همه</span>
                </button>
              )}
            </div>

            {/* List */}
            <div className={s.list}>
              {items.length === 0 ? (
                <div className={s.empty} dir="rtl">
                  <Bell size={20} className={s.emptyIcon} aria-hidden />
                  <span>اعلانی وجود ندارد</span>
                </div>
              ) : (
                items.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className={cn(s.item, !item.read && s.itemUnread)}
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => markRead(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') markRead(item.id);
                    }}
                  >
                    <span className={cn(s.itemDot, s[`dot_${item.tone}`])} aria-hidden>
                      {toneIcon(item.tone)}
                    </span>
                    <div className={s.itemContent}>
                      <span className={s.itemTitle}>{item.title}</span>
                      {item.description && <span className={s.itemDesc}>{item.description}</span>}
                      <span className={s.itemTime}>{formatRelative(item.timestamp)}</span>
                    </div>
                    {item.href && (
                      <Link
                        href={item.href}
                        className={s.itemLink}
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(item.id);
                          setOpen(false);
                        }}
                      >
                        {item.actionLabel || 'مشاهده'}
                        <ChevronLeft size={10} aria-hidden />
                      </Link>
                    )}
                    {item.href && <ExternalLink size={10} className={s.externalIcon} aria-hidden />}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className={s.footer}>
              <Link
                href={viewAllHref || defaultHref}
                className={s.viewAll}
                onClick={() => setOpen(false)}
              >
                مشاهده همه اعلان‌ها
                <ExternalLink size={10} aria-hidden />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
