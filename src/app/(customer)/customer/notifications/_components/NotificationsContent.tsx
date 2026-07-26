'use client';

import { markNotificationsRead } from '@/actions/customer-portal';
import type { CustomerNotification } from '@/actions/customer-portal';
import { EmptyState } from '@/components/Dashboard/primitives';
import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import s from './NotificationsContent.module.css';

interface Props {
  notifications: CustomerNotification[];
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

export default function NotificationsContent({ notifications }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function handleMarkAllRead() {
    startTransition(async () => {
      await markNotificationsRead();
      router.refresh();
    });
  }

  return (
    <div className={s.root}>
      {unreadCount > 0 && (
        <div className={s.toolbar}>
          <span className={s.unreadBadge}>
            {new Intl.NumberFormat('fa-IR').format(unreadCount)} خوانده‌نشده
          </span>
          <button
            type="button"
            className={s.markAllBtn}
            onClick={handleMarkAllRead}
            disabled={isPending}
          >
            <CheckCheck className="w-4 h-4" aria-hidden />
            {isPending ? 'در حال ثبت...' : 'همه را خوانده‌شده کن'}
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="اعلانی وجود ندارد"
          description="پیام‌های جدید اینجا نمایش داده می‌شوند"
        />
      ) : (
        <div className={s.list}>
          {notifications.map((notif) => (
            <div key={notif.id} className={s.item} data-read={notif.isRead}>
              <div className={s.dot} data-read={notif.isRead} aria-hidden />
              <div className={s.body}>
                <p className={s.message}>{notif.message}</p>
                <time className={s.date} dateTime={new Date(notif.createdAt).toISOString()}>
                  {formatDate(notif.createdAt)}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
