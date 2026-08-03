'use client';

/**
 * NotificationsContent — «اینباکس هوشمند» (Smart Inbox)
 * ----------------------------------------------------------------------------
 *  - Toolbar:  شمارنده + دکمه علامت‌گذاری همه
 *  - Grouped:  گروه‌بندی خودکار (امروز / دیروز / این هفته / قبل‌تر)
 *  - Inbox:    لیست پیام‌ها با rail رنگی
 *  - Empty:    حالت خالی
 */

import { markNotificationsRead } from '@/actions/customer-portal';
import type { CustomerNotification } from '@/actions/customer-portal';
import { faDate, faNum, relativeTime } from '@/app/(customer)/customer/_lib/customer-formatters';
import { EmptyHint, SectionHeader } from '@/app/(customer)/customer/_lib/customer-ui';
import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import s from './NotificationsContent.module.css';

interface Props {
  notifications: CustomerNotification[];
}

interface Group {
  label: string;
  items: CustomerNotification[];
}

function groupByDate(items: CustomerNotification[]): Group[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const todayItems: CustomerNotification[] = [];
  const yesterdayItems: CustomerNotification[] = [];
  const weekItems: CustomerNotification[] = [];
  const olderItems: CustomerNotification[] = [];

  for (const n of items) {
    const d = new Date(n.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      todayItems.push(n);
    } else if (d.getTime() === yesterday.getTime()) {
      yesterdayItems.push(n);
    } else if (d.getTime() >= weekAgo.getTime()) {
      weekItems.push(n);
    } else {
      olderItems.push(n);
    }
  }

  const groups: Group[] = [];
  if (todayItems.length > 0) groups.push({ label: 'امروز', items: todayItems });
  if (yesterdayItems.length > 0) groups.push({ label: 'دیروز', items: yesterdayItems });
  if (weekItems.length > 0) groups.push({ label: 'این هفته', items: weekItems });
  if (olderItems.length > 0) groups.push({ label: 'قبل‌تر', items: olderItems });
  return groups;
}

export default function NotificationsContent({ notifications }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = groupByDate(notifications);

  function handleMarkAllRead() {
    startTransition(async () => {
      await markNotificationsRead();
      router.refresh();
    });
  }

  return (
    <div className={s.root} dir="rtl">
      {unreadCount > 0 && (
        <div className={s.toolbar} role="status">
          <div className={s.toolbarLeft}>
            <span className={s.toolbarDot} aria-hidden />
            <span className={s.toolbarLabel}>{faNum(unreadCount)} اعلان خوانده‌نشده</span>
          </div>
          <button
            type="button"
            className={s.markAllBtn}
            onClick={handleMarkAllRead}
            disabled={isPending}
          >
            <CheckCheck size={11} aria-hidden />
            {isPending ? 'در حال ثبت...' : 'همه را خوانده‌شده کن'}
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <section className={s.section}>
          <SectionHeader icon={Bell} title="صندوق ورودی" sub="خالی" />
          <EmptyHint
            icon={Bell}
            title="اعلانی وجود ندارد"
            description="پیام‌های جدید اینجا نمایش داده می‌شوند"
          />
        </section>
      ) : (
        <div className={s.groups}>
          {groups.map((group) => (
            <section key={group.label} className={s.section} aria-label={group.label}>
              <div className={s.groupHead}>
                <span className={s.groupLabel}>{group.label}</span>
                <span className={s.groupCount}>{faNum(group.items.length)}</span>
              </div>
              <ol className={s.list}>
                {group.items.map((n, i) => (
                  <li
                    key={n.id}
                    className={s.item}
                    data-read={n.isRead}
                    style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                  >
                    <span className={s.rail} data-read={n.isRead} aria-hidden />
                    <span className={s.dot} data-read={n.isRead} aria-hidden />
                    <div className={s.body}>
                      <p className={s.message}>{n.message}</p>
                      <time
                        className={s.date}
                        dateTime={new Date(n.createdAt).toISOString()}
                        title={faDate(n.createdAt)}
                      >
                        {relativeTime(n.createdAt)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
