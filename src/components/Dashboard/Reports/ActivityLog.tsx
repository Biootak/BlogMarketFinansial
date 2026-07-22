'use client';

/**
 * ActivityLog — 2026 User Activity Report
 * DS tokens only · RTL-safe · no Tailwind color classes
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
  FileText,
  Loader2,
  MoreHorizontal,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import s from './ActivityLog.module.css';

function getActionCss(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('create') || a.includes('ایجاد')) return s.actionCreate;
  if (a.includes('update') || a.includes('ویرایش')) return s.actionUpdate;
  if (a.includes('delete') || a.includes('حذف')) return s.actionDelete;
  if (a.includes('login') || a.includes('ورود')) return s.actionLogin;
  return s.actionDefault;
}

export default function ActivityLogComponent() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

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
      <div className={s.head}>
        <div className={s.headIcon} aria-hidden>
          <Activity size={16} />
        </div>
        <div>
          <h3 className={s.headTitle}>گزارش فعالیت‌ها</h3>
          <p className={s.headDesc}>تاریخچه فعالیت‌های کاربران سیستم</p>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className={s.kpiStrip} role="status">
        <div className={s.kpiItem}>
          <span className={s.kpiLabel}>کل فعالیت‌ها</span>
          <span className={s.kpiVal}>{total.toLocaleString('fa-IR')}</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={s.kpiLabel}>صفحه فعلی</span>
          <span className={s.kpiVal}>{page.toLocaleString('fa-IR')}</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={s.kpiLabel}>در هر صفحه</span>
          <span className={s.kpiVal}>{LIMIT.toLocaleString('fa-IR')}</span>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className={s.loadWrap} aria-label="در حال بارگذاری">
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: 'var(--at-accent)' }}
            aria-hidden
          />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="فعالیتی ثبت نشده"
          description="هنوز هیچ رویدادی در سیستم ثبت نشده است."
        />
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table} aria-label="گزارش فعالیت‌ها">
            <thead>
              <tr>
                <th className={s.th}>
                  <User size={12} aria-hidden /> کاربر
                </th>
                <th className={s.th}>
                  <MoreHorizontal size={12} aria-hidden /> عملیات
                </th>
                <th className={s.th}>
                  <FileText size={12} aria-hidden /> جزئیات
                </th>
                <th className={s.th}>
                  <Clock size={12} aria-hidden /> زمان
                </th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, i) => (
                <tr
                  key={activity.id}
                  className={s.tr}
                  style={{ '--row-i': i } as React.CSSProperties}
                >
                  <td className={s.td}>
                    <div className={s.user}>
                      <div className={s.avatar} aria-hidden>
                        {(activity.user?.name ?? 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className={s.userName}>{activity.user?.name ?? 'ناشناس'}</p>
                        <p className={s.userEmail} dir="ltr">
                          {activity.user?.email ?? '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={s.td}>
                    <span className={`${s.actionBadge} ${getActionCss(activity.action)}`}>
                      {activity.action}
                    </span>
                  </td>
                  <td className={s.td}>
                    <p className={s.details}>{activity.details ?? '—'}</p>
                  </td>
                  <td className={s.td}>
                    <time className={s.time} dateTime={new Date(activity.createdAt).toISOString()}>
                      {new Date(activity.createdAt).toLocaleDateString('fa-IR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && !loading && (
        <div className={s.pagination}>
          <span className={s.paginationInfo}>
            نمایش <strong>{Math.min(page * LIMIT, total).toLocaleString('fa-IR')}</strong> از{' '}
            <strong>{total.toLocaleString('fa-IR')}</strong>
          </span>
          <div className={s.paginationBtns}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronRight size={14} aria-hidden /> قبلی
            </Button>
            <span className={s.pageNum}>
              {page.toLocaleString('fa-IR')} / {totalPages.toLocaleString('fa-IR')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * LIMIT >= total || loading}
            >
              بعدی <ChevronLeft size={14} aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
