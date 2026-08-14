'use client';

/**
 * NotificationsClient — 2026 Notification Intelligence Center
 *
 * طراحی: Linear Inbox × Mercury × Attio — glass KPI strip + frosted toolbar
 * ویژگی‌ها:
 *  • KPI Glass Strip: همه / خوانده‌نشده / سیستمی / امنیتی با رنگ‌بندی domain
 *  • Frosted sticky toolbar با tabs + bulk actions
 *  • Notification type detection: payment, security, kyc, system, message
 *  • Icon رنگی domain-aware برای هر نوع
 *  • Date-grouped timeline: امروز / دیروز / این هفته / قدیمی‌تر
 *  • Type badge کوچک
 *  • Bulk select + mark read + delete
 *  • Unread accent bar (vertical line inline-start)
 *  • Stagger animation
 *  • عملیات optimistic (local state فوری)
 */

import {
  type NotificationRow,
  clearNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/actions/notification-actions';
import { MillionDollarEmpty, PageHeader } from '@/components/Dashboard/primitives';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  Bell,
  Check,
  CheckCheck,
  CreditCard,
  Info,
  MessageCircle,
  Settings,
  ShieldAlert,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './NotificationsClient.module.css';

/* ──────────────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────────────────── */

interface Props {
  notifications: NotificationRow[];
  total: number;
}

type Tab = 'all' | 'unread';

type NotifType = 'payment' | 'security' | 'kyc' | 'system' | 'message' | 'success' | 'default';

/* ──────────────────────────────────────────────────────────────────────────────
   Notification type detection (domain-aware, Persian keywords)
   ────────────────────────────────────────────────────────────────────────────── */

function detectType(message: string): NotifType {
  if (/پرداخت|تراکنش|واریز|برداشت|مبلغ|ریال|تومان|کارمزد|تسویه|فاکتور/.test(message))
    return 'payment';
  if (/امنیت|هشدار|مسدود|تعلیق|تغییر رمز|ورود مشکوک|دسترسی|تخلف/.test(message)) return 'security';
  if (/احراز|KYC|هویت|مدارک|تأیید هویت|بررسی/.test(message)) return 'kyc';
  if (/موفق|تأیید شد|انجام شد|کامل شد|فعال/.test(message)) return 'success';
  if (/پیام|اطلاعیه|گفتگو|پشتیبانی/.test(message)) return 'message';
  if (/سیستم|بروزرسانی|نسخه|تنظیمات|نگهداری|زیرساخت/.test(message)) return 'system';
  return 'default';
}

/* ──────────────────────────────────────────────────────────────────────────────
   Type → Icon + CSS module class
   ────────────────────────────────────────────────────────────────────────────── */

type TypeConfig = {
  icon: React.ElementType;
  className: string;
  badge: string;
};

const TYPE_CONFIG: Record<NotifType, TypeConfig> = {
  payment: { icon: CreditCard, className: s.typePayment, badge: 'مالی' },
  security: { icon: ShieldAlert, className: s.typeSecurity, badge: 'امنیتی' },
  kyc: { icon: UserCheck, className: s.typeKyc, badge: 'احراز' },
  success: { icon: Check, className: s.typeSuccess, badge: 'موفق' },
  message: { icon: MessageCircle, className: s.typeMessage, badge: 'پیام' },
  system: { icon: Settings, className: s.typeSystem, badge: 'سیستم' },
  default: { icon: Bell, className: s.typeDefault, badge: 'اعلان' },
};

/* ──────────────────────────────────────────────────────────────────────────────
   Date grouping (Persian)
   ────────────────────────────────────────────────────────────────────────────── */

type DateGroupKey = 'today' | 'yesterday' | 'this-week' | 'older';

interface DateGroup {
  key: DateGroupKey;
  label: string;
  items: (NotificationRow & { type: NotifType })[];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function groupByDate(items: (NotificationRow & { type: NotifType })[]): DateGroup[] {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const groups: Record<DateGroupKey, (NotificationRow & { type: NotifType })[]> = {
    today: [],
    yesterday: [],
    'this-week': [],
    older: [],
  };

  for (const item of items) {
    if (isSameDay(item.createdAt, now)) groups.today.push(item);
    else if (isSameDay(item.createdAt, yesterday)) groups.yesterday.push(item);
    else if (item.createdAt > weekAgo) groups['this-week'].push(item);
    else groups.older.push(item);
  }

  const LABELS: Record<DateGroupKey, string> = {
    today: 'امروز',
    yesterday: 'دیروز',
    'this-week': 'این هفته',
    older: 'قدیمی‌تر',
  };

  return (Object.keys(groups) as DateGroupKey[])
    .filter((k) => groups[k].length > 0)
    .map((k) => ({ key: k, label: LABELS[k], items: groups[k] }));
}

/* ──────────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────────── */

const fa = new Intl.NumberFormat('fa-IR');

/* ──────────────────────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────────────────────── */

export default function NotificationsClient({ notifications: initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<NotificationRow[]>(initial);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* ── derived state ─────────────────────────────────────────────────────────── */
  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);
  const securityCount = useMemo(
    () => items.filter((n) => detectType(n.message) === 'security').length,
    [items],
  );
  const systemCount = useMemo(
    () => items.filter((n) => detectType(n.message) === 'system').length,
    [items],
  );

  const enriched = useMemo(
    () => items.map((n) => ({ ...n, type: detectType(n.message) })),
    [items],
  );

  const displayed = useMemo(
    () => (activeTab === 'unread' ? enriched.filter((n) => !n.isRead) : enriched),
    [enriched, activeTab],
  );

  const grouped = useMemo(() => groupByDate(displayed), [displayed]);

  const allDisplayedIds = useMemo(() => displayed.map((n) => n.id), [displayed]);
  const allSelected = selectedIds.size === allDisplayedIds.length && allDisplayedIds.length > 0;

  /* ── single read ───────────────────────────────────────────────────────────── */
  const handleRead = useCallback((id: number) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    startTransition(async () => {
      await markNotificationRead(id);
    });
  }, []);

  /* ── mark all read ─────────────────────────────────────────────────────────── */
  const handleMarkAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.success) {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
      }
    });
  }, [toast]);

  /* ── single delete ─────────────────────────────────────────────────────────── */
  const handleDelete = useCallback(
    (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setItems((prev) => prev.filter((n) => n.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      startTransition(async () => {
        const result = await deleteNotification(id);
        if (!result.success) {
          toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
        }
      });
    },
    [toast],
  );

  /* ── clear all ─────────────────────────────────────────────────────────────── */
  const handleClearAll = useCallback(() => {
    startTransition(async () => {
      const result = await clearNotifications();
      if (result.success) {
        setItems([]);
        setSelectedIds(new Set());
        toast({ title: 'همه اعلان‌ها پاک شدند' });
        router.refresh();
      } else {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
      }
    });
  }, [toast, router]);

  /* ── bulk select ───────────────────────────────────────────────────────────── */
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allDisplayedIds));
    }
  }, [allSelected, allDisplayedIds]);

  /* ── bulk mark read ────────────────────────────────────────────────────────── */
  const handleBulkRead = useCallback(() => {
    const ids = Array.from(selectedIds);
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)));
    setSelectedIds(new Set());
    startTransition(async () => {
      await Promise.all(ids.map((id) => markNotificationRead(id)));
    });
  }, [selectedIds]);

  /* ── bulk delete ───────────────────────────────────────────────────────────── */
  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    setItems((prev) => prev.filter((n) => !ids.includes(n.id)));
    setSelectedIds(new Set());
    startTransition(async () => {
      await Promise.all(ids.map((id) => deleteNotification(id)));
    });
  }, [selectedIds]);

  /* ── item click (mark read if unread) ─────────────────────────────────────── */
  const handleItemClick = useCallback(
    (n: NotificationRow) => {
      if (!n.isRead) handleRead(n.id);
    },
    [handleRead],
  );

  /* ──────────────────────────────────────────────────────────────────────────── */

  return (
    <div className={s.root}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'اعلان‌ها' }]}
        title="مرکز اعلان‌ها"
        description="رویدادها، هشدارها و پیام‌های سیستم مالی"
        eyebrow="اعلان"
        icon="bell"
        accent="cyan"
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

      {/* ── KPI Glass Strip ──────────────────────────────────────────────────── */}
      <div className={s.kpiStrip} role="group" aria-label="خلاصه اعلان‌ها">
        {/* Total */}
        <div
          className={`${s.kpiCard} ${s.kpiAll} ${activeTab === 'all' ? s.kpiCardActive : ''}`}
          style={{ '--kpi-delay': '0ms' } as React.CSSProperties}
          onClick={() => setActiveTab('all')}
          role="button"
          tabIndex={0}
          aria-pressed={activeTab === 'all'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveTab('all');
          }}
        >
          <span className={s.kpiIcon} aria-hidden>
            <Bell size={15} />
          </span>
          <span className={s.kpiValue}>{fa.format(items.length)}</span>
          <span className={s.kpiLabel}>همه اعلان‌ها</span>
        </div>

        {/* Unread */}
        <div
          className={`${s.kpiCard} ${s.kpiUnread} ${activeTab === 'unread' ? s.kpiCardActive : ''}`}
          style={{ '--kpi-delay': '60ms' } as React.CSSProperties}
          onClick={() => setActiveTab('unread')}
          role="button"
          tabIndex={0}
          aria-pressed={activeTab === 'unread'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveTab('unread');
          }}
        >
          <span className={s.kpiIcon} aria-hidden>
            <Info size={15} />
          </span>
          <span className={s.kpiValue}>{fa.format(unreadCount)}</span>
          <span className={s.kpiLabel}>خوانده‌نشده</span>
        </div>

        {/* Security */}
        <div
          className={`${s.kpiCard} ${s.kpiSecurity}`}
          style={{ '--kpi-delay': '120ms' } as React.CSSProperties}
          aria-label={`${fa.format(securityCount)} اعلان امنیتی`}
        >
          <span className={s.kpiIcon} aria-hidden>
            <ShieldAlert size={15} />
          </span>
          <span className={s.kpiValue}>{fa.format(securityCount)}</span>
          <span className={s.kpiLabel}>امنیتی</span>
        </div>

        {/* System */}
        <div
          className={`${s.kpiCard} ${s.kpiSystem}`}
          style={{ '--kpi-delay': '180ms' } as React.CSSProperties}
          aria-label={`${fa.format(systemCount)} اعلان سیستمی`}
        >
          <span className={s.kpiIcon} aria-hidden>
            <Settings size={15} />
          </span>
          <span className={s.kpiValue}>{fa.format(systemCount)}</span>
          <span className={s.kpiLabel}>سیستمی</span>
        </div>
      </div>

      {/* ── Frosted Toolbar ──────────────────────────────────────────────────── */}
      <div className={s.toolbar} role="toolbar" aria-label="فیلتر اعلان‌ها">
        <div className={s.toolbarStart}>
          {/* Tab Segment */}
          <div className={s.tabs} role="tablist">
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
                  <span className={s.tabBadge}>{fa.format(unreadCount)}</span>
                )}
                {tab === 'all' && items.length > 0 && (
                  <span className={s.tabCount}>{fa.format(items.length)}</span>
                )}
              </button>
            ))}
          </div>

          {/* Select All checkbox */}
          {displayed.length > 0 && (
            <Checkbox
              className={s.itemCheckbox}
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="انتخاب همه"
              title="انتخاب همه"
            />
          )}
        </div>

        <div className={s.toolbarEnd}>
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
        </div>
      </div>

      {/* ── Bulk Action Bar ──────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className={s.bulkBar} role="region" aria-label="عملیات دسته‌جمعی">
          <span className={s.bulkCount}>{fa.format(selectedIds.size)} مورد انتخاب شده</span>
          <div className={s.bulkActions}>
            <button
              type="button"
              className={s.bulkBtn}
              onClick={handleBulkRead}
              disabled={isPending}
            >
              <CheckCheck size={13} aria-hidden />
              خوانده شد
            </button>
            <button
              type="button"
              className={`${s.bulkBtn} ${s.bulkBtnDanger}`}
              onClick={handleBulkDelete}
              disabled={isPending}
            >
              <Trash2 size={13} aria-hidden />
              حذف انتخاب‌شده
            </button>
          </div>
        </div>
      )}

      {/* ── Count Strip ──────────────────────────────────────────────────────── */}
      {displayed.length > 0 && (
        <div className={s.countStrip} aria-live="polite" aria-atomic>
          <span className={s.countStripNum}>{fa.format(displayed.length)}</span>
          <span> اعلان</span>
          <div className={s.countStripLine} aria-hidden />
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────────────────── */}
      {displayed.length === 0 && (
        <MillionDollarEmpty
          variant="bell"
          tone="primary"
          eyebrow={activeTab === 'unread' ? 'مرکز اعلان‌ها' : 'مرکز اعلان‌ها'}
          title={activeTab === 'unread' ? 'اعلان خوانده‌نشده‌ای ندارید' : 'اعلانی ندارید'}
          description={
            activeTab === 'unread'
              ? 'همهٔ اعلان‌ها خوانده شده‌اند. کار خوبی است!'
              : 'وقتی رویداد جدیدی رخ دهد، اینجا نمایش داده می‌شود'
          }
        />
      )}

      {/* ── Grouped Timeline ─────────────────────────────────────────────────── */}
      {grouped.length > 0 && (
        <ul className={s.list} aria-label="اعلان‌ها">
          {grouped.map((group) => (
            <li key={group.key} className={s.dateGroup}>
              {/* Date group label */}
              <div className={s.dateGroupLabel} aria-label={group.label}>
                <span className={s.dateGroupLabelText}>{group.label}</span>
                <div className={s.dateGroupLine} aria-hidden />
              </div>

              {/* Items card */}
              <div
                className={s.listCard}
                data-pending={group.items.some((_n) => isPending) ? 'true' : undefined}
              >
                {group.items.map((n, i) => {
                  const cfg = TYPE_CONFIG[n.type];
                  const Icon = cfg.icon;
                  const isSelected = selectedIds.has(n.id);

                  return (
                    <article
                      key={n.id}
                      className={`${s.item} ${!n.isRead ? s.itemUnread : ''} ${cfg.className}`}
                      style={{ '--item-i': i } as React.CSSProperties}
                      onClick={() => handleItemClick(n)}
                      aria-label={`${!n.isRead ? 'خوانده‌نشده: ' : ''}${n.message}`}
                    >
                      {/* Unread dot */}
                      <span className={s.unreadDot} aria-hidden={n.isRead || undefined} />

                      {/* Bulk checkbox */}
                      <Checkbox
                        className={s.itemCheckbox}
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleSelect(n.id)}
                        aria-label={`انتخاب: ${n.message}`}
                      />

                      {/* Type icon */}
                      <span
                        className={`${s.itemIcon} ${!n.isRead ? s.itemIconUnread : ''}`}
                        aria-hidden
                      >
                        <Icon size={16} />
                      </span>

                      {/* Content */}
                      <div className={s.itemContent}>
                        <div className={s.itemHeader}>
                          {/* Type badge */}
                          <span className={s.itemTypeBadge}>{cfg.badge}</span>
                          {/* Time */}
                          <time
                            className={s.itemTime}
                            dateTime={n.createdAt.toISOString()}
                            title={n.createdAt.toLocaleString('fa-IR')}
                          >
                            {n.time}
                          </time>
                        </div>
                        <p className={`${s.itemMsg} ${!n.isRead ? s.itemMsgUnread : ''}`}>
                          {n.message}
                        </p>
                      </div>

                      {/* Item actions */}
                      <div className={s.itemActions} onClick={(e) => e.stopPropagation()}>
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
                          title="حذف"
                        >
                          <X size={13} aria-hidden />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
