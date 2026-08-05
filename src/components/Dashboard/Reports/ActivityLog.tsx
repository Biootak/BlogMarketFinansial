'use client';

/**
 * ActivityLog 2026 — Timeline + Table Hybrid Layout
 * ─ Timeline feed برای رویدادهای اخیر + جدول compact
 * ─ DS tokens only · RTL-safe · no hex · pagination واقعی
 */

import { getActivityLog } from '@/actions/reports/activityLogs';
import type { ActivityLog } from '@/actions/reports/activityLogs';
import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogIn,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import s from './ActivityLog.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ActionMeta {
  icon: React.ReactNode;
  css: string;
  label: string;
}

function getActionMeta(action: string): ActionMeta {
  const a = action.toLowerCase();
  if (a.includes('create') || a.includes('ایجاد'))
    return { icon: <Plus size={12} />, css: s.actionCreate, label: 'ایجاد' };
  if (a.includes('update') || a.includes('edit') || a.includes('ویرایش'))
    return { icon: <Pencil size={12} />, css: s.actionUpdate, label: 'ویرایش' };
  if (a.includes('delete') || a.includes('حذف'))
    return { icon: <Trash2 size={12} />, css: s.actionDelete, label: 'حذف' };
  if (a.includes('login') || a.includes('ورود'))
    return { icon: <LogIn size={12} />, css: s.actionLogin, label: 'ورود' };
  return { icon: <Activity size={12} />, css: s.actionDefault, label: action };
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  return new Date(date).toLocaleDateString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Timeline Item ────────────────────────────────────────────────────────────

interface TimelineItemProps {
  activity: ActivityLog & { userEmail?: string };
  isLast: boolean;
  idx: number;
}

function TimelineItem({ activity, isLast, idx }: TimelineItemProps) {
  const meta = getActionMeta(activity.action);
  const initials = (activity.user?.name ?? 'U').slice(0, 2).toUpperCase();

  return (
    <div
      className={`${s.timelineItem} ${isLast ? s.timelineItemLast : ''}`}
      style={{ '--row-i': idx } as React.CSSProperties}
    >
      {/* Timeline line + dot */}
      <div className={s.timelineTrack} aria-hidden>
        <span className={`${s.timelineDot} ${meta.css}`}>
          {meta.icon}
        </span>
        {!isLast && <span className={s.timelineLine} />}
      </div>

      {/* Content */}
      <div className={s.timelineContent}>
        <div className={s.timelineHead}>
          <div className={s.timelineUser}>
            <span className={s.avatar} aria-hidden>{initials}</span>
            <div>
              <p className={s.userName}>{activity.user?.name ?? 'ناشناس'}</p>
              <p className={s.userEmail} dir="ltr">{activity.user?.email ?? '—'}</p>
            </div>
          </div>
          <span className={s.timelineTime}>
            <Clock size={11} aria-hidden />
            <time dateTime={new Date(activity.createdAt).toISOString()}>
              {timeAgo(new Date(activity.createdAt))}
            </time>
          </span>
        </div>

        <div className={s.timelineBody}>
          <span className={`${s.actionBadge} ${meta.css}`}>
            {meta.icon}
            {activity.action}
          </span>
          {activity.details && (
            <p className={s.details}>{activity.details}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ActivityLogComponent() {
  const [activities, setActivities] = useState<(ActivityLog & { userEmail?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const result = await getActivityLog(page, LIMIT).catch(() => null);
    setLoading(false);
    if (result?.success && result.data) {
      setActivities(
        result.data.activities.map((a) => ({
          ...a,
          createdAt: new Date(a.createdAt as string),
          userEmail: a.user?.email ?? '',
          user: { ...a.user, name: a.user?.name || 'کاربر ناشناس', email: a.user?.email ?? '' },
        })),
      );
      setTotal(result.data.total);
    } else {
      toast({ title: 'خطا', description: 'خطا در دریافت گزارش فعالیت‌ها', variant: 'destructive' });
    }
  }, [page]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className={s.root} dir="rtl">
      {/* ── Header ── */}
      <div className={s.header}>
        <div className={s.headerMain}>
          <span className={s.headerIcon} aria-hidden>
            <Activity size={17} />
          </span>
          <div>
            <h3 className={s.headerTitle}>فعالیت‌های سیستم</h3>
            <p className={s.headerDesc}>تاریخچه عملیات کاربران</p>
          </div>
        </div>
        <div className={s.headerMeta} role="status" aria-live="polite">
          <span className={s.totalBadge}>
            {total.toLocaleString('fa-IR')} رویداد
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className={s.skeletonList} aria-label="در حال بارگذاری">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={s.skRow} style={{ '--sk-i': i } as React.CSSProperties} />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="فعالیتی ثبت نشده"
          description="هنوز هیچ رویدادی در سیستم ثبت نشده است."
        />
      ) : (
        <div className={s.timeline}>
          {activities.map((activity, i) => (
            <TimelineItem
              key={activity.id}
              activity={activity}
              isLast={i === activities.length - 1}
              idx={i}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && !loading && (
        <div className={s.pagination}>
          <span className={s.paginationInfo}>
            نمایش{' '}
            <strong>{((page - 1) * LIMIT + 1).toLocaleString('fa-IR')}</strong>
            {' '}تا{' '}
            <strong>{Math.min(page * LIMIT, total).toLocaleString('fa-IR')}</strong>
            {' '}از{' '}
            <strong>{total.toLocaleString('fa-IR')}</strong>
          </span>
          <div className={s.paginationBtns}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              aria-label="صفحه قبلی"
            >
              <ChevronRight size={14} aria-hidden />
              قبلی
            </Button>
            <span className={s.pageNum} aria-current="page">
              {page.toLocaleString('fa-IR')} / {totalPages.toLocaleString('fa-IR')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * LIMIT >= total || loading}
              aria-label="صفحه بعدی"
            >
              بعدی
              <ChevronLeft size={14} aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
