'use client';

/**
 * NotificationsClient — 2026 Notification Inbox
 *
 * طراحی: Vercel/Linear inbox — unread dot، group by date، mark-as-read، bulk clear
 * ویژگی‌ها:
 * - نشانگر unread (نقطه آبی) روی هر item
 * - کلیک روی item → markNotificationRead
 * - دکمه «خواندن همه»
 * - Tab: همه / خوانده‌نشده
 * - حذف تکی و bulk
 * - Stagger animation
 */

import {
  type NotificationRow,
  clearNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/actions/notification-actions';
import { EmptyState, PageHeader } from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import { Bell, BellOff, CheckCheck, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './NotificationsClient.module.css';

interface Props {
  notifications: NotificationRow[];
  total: number;
}

type Tab = 'all' | 'unread';

export default function NotificationsClient({ notifications: initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<NotificationRow[]>(initial);
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);
  const displayed = activeTab === 'unread' ? items.filter((n) => !n.isRead) : items;

  const handleRead = useCallback((id: number) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    startTransition(async () => {
      await markNotificationRead(id);
    });
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.success) {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
      }
    });
  }, [toast]);

  const handleDelete = useCallback(
    (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      startTransition(async () => {
        const result = await deleteNotification(id);
        if (result.success) {
          setItems((prev) => prev.filter((n) => n.id !== id));
        } else {
          toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
        }
      });
    },
    [toast],
  );

  const handleClearAll = useCallback(() => {
    startTransition(async () => {
      const result = await clearNotifications();
      if (result.success) {
        setItems([]);
        toast({ title: 'همه اعلان‌ها پاک شدند' });
        router.refresh();
      } else {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
      }
    });
  }, [toast, router]);

  return (
    <div className={s.root}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'اعلان‌ها' }]}
        title="مرکز اعلان‌ها"
        description="رویدادها، هشدارها و پیام‌های سیستم"
        eyebrow="اعلان"
        actions={
          <div className={s.headerActions}>
            {unreadCount > 0 && (
              <button
                type="button"
                className={s.markAllBtn}
                onClick={handleMarkAllRead}
                disabled={isPending}
              >
                <CheckCheck size={13} aria-hidden />
                خواندن همه
              </button>
            )}
            {items.length > 0 && (
              <button
                type="button"
                className={s.clearBtn}
                onClick={handleClearAll}
                disabled={isPending}
              >
                <Trash2 size={13} aria-hidden />
                پاک کردن همه
              </button>
            )}
          </div>
        }
      />

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <div className={s.tabBar} role="tablist">
        {(['all', 'unread'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`${s.tab} ${activeTab === tab ? s.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? 'همه' : 'خوانده‌نشده'}
            {tab === 'unread' && unreadCount > 0 && (
              <span className={s.tabBadge}>
                {new Intl.NumberFormat('fa-IR').format(unreadCount)}
              </span>
            )}
            {tab === 'all' && items.length > 0 && (
              <span className={s.tabCount}>
                {new Intl.NumberFormat('fa-IR').format(items.length)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── List ─────────────────────────────────────────────────────── */}
      {displayed.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={activeTab === 'unread' ? 'اعلان خوانده‌نشده‌ای ندارید' : 'اعلانی ندارید'}
          description={
            activeTab === 'unread'
              ? 'همه اعلان‌ها خوانده شده‌اند'
              : 'وقتی رویداد جدیدی اتفاق بیفتد، اینجا نمایش داده می‌شود'
          }
        />
      ) : (
        <ul className={s.list} aria-label="اعلان‌ها">
          {displayed.map((n, i) => (
            <li
              key={n.id}
              className={`${s.item} ${!n.isRead ? s.itemUnread : ''}`}
              style={{ '--item-i': i } as React.CSSProperties}
              onClick={() => !n.isRead && handleRead(n.id)}
              tabIndex={!n.isRead ? 0 : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !n.isRead) handleRead(n.id);
              }}
              aria-label={`${!n.isRead ? 'خوانده‌نشده: ' : ''}${n.message}`}
            >
              {/* unread dot */}
              <span className={s.unreadDot} aria-hidden={n.isRead || undefined} />

              {/* آیکون */}
              <span className={`${s.itemIcon} ${!n.isRead ? s.itemIconUnread : ''}`} aria-hidden>
                <Bell size={15} />
              </span>

              {/* متن */}
              <div className={s.itemContent}>
                <p className={`${s.itemMsg} ${!n.isRead ? s.itemMsgUnread : ''}`}>{n.message}</p>
                <time className={s.itemTime} dateTime={n.createdAt.toISOString()}>
                  {n.time}
                </time>
              </div>

              {/* اقدامات */}
              <div className={s.itemActions}>
                {!n.isRead && (
                  <button
                    type="button"
                    className={s.readBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRead(n.id);
                    }}
                    aria-label="علامت‌گذاری به عنوان خوانده‌شده"
                    disabled={isPending}
                    title="خوانده شد"
                  >
                    <CheckCheck size={12} aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  className={s.deleteBtn}
                  onClick={(e) => handleDelete(n.id, e)}
                  aria-label="حذف اعلان"
                  disabled={isPending}
                >
                  <X size={13} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
