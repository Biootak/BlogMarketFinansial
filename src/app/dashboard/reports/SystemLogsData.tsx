'use client';

/**
 * SystemLogsData — 2026 System Logs Viewer
 * DS tokens only (--ds-* / --at-*) — no Tailwind color classes
 * Terminal-inspired · high-density · RTL-safe
 */

import { getSystemLogs } from '@/actions/reportActions';
import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  Terminal,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import s from './SystemLogsData.module.css';

interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: Date;
}

type LogLevel = 'ERROR' | 'WARNING' | 'INFO';

const LEVEL_META: Record<LogLevel, { label: string; icon: React.ReactNode; css: string }> = {
  ERROR: { label: 'خطا', icon: <AlertCircle size={13} aria-hidden />, css: s.levelError },
  WARNING: { label: 'هشدار', icon: <AlertTriangle size={13} aria-hidden />, css: s.levelWarning },
  INFO: { label: 'اطلاعات', icon: <Info size={13} aria-hidden />, css: s.levelInfo },
};

function getLevelMeta(level: string) {
  return (
    LEVEL_META[level.toUpperCase() as LogLevel] ?? {
      label: level,
      icon: <Info size={13} aria-hidden />,
      css: s.levelDefault,
    }
  );
}

export default function SystemLogsData() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [level, setLevel] = useState('all');
  const LIMIT = 10;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const result = await getSystemLogs(page, LIMIT, level === 'all' ? undefined : level).catch(
      () => null,
    );
    setLoading(false);
    if (result?.success && result.data) {
      setLogs(result.data.logs);
      setTotal(result.data.total);
    } else {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: result?.message ?? 'خطا در دریافت لاگ‌ها',
      });
    }
  }, [page, level]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / LIMIT);
  const errCount = logs.filter((l) => l.level === 'ERROR').length;
  const warnCount = logs.filter((l) => l.level === 'WARNING').length;
  const infoCount = logs.filter((l) => l.level === 'INFO').length;

  if (loading) {
    return (
      <div className={s.loading} aria-label="در حال بارگذاری">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className={s.skRow} />
        ))}
      </div>
    );
  }

  return (
    <div className={s.root} dir="rtl">
      {/* ── Header ── */}
      <div className={s.head}>
        <div className={s.headLeft}>
          <div className={s.headIcon} aria-hidden>
            <Terminal size={16} />
          </div>
          <div>
            <h3 className={s.headTitle}>لاگ‌های سیستم</h3>
            <p className={s.headDesc}>مشاهده و فیلتر رویدادهای سیستم</p>
          </div>
        </div>
        <div className={s.headRight}>
          <Select
            value={level}
            onValueChange={(v) => {
              setLevel(v);
              setPage(1);
            }}
          >
            <SelectTrigger className={s.levelSelect}>
              <SelectValue placeholder="سطح لاگ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه سطوح</SelectItem>
              <SelectItem value="INFO">اطلاعات</SelectItem>
              <SelectItem value="WARNING">هشدار</SelectItem>
              <SelectItem value="ERROR">خطا</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className={s.kpiStrip}>
        <div className={s.kpiItem}>
          <span className={s.kpiIcon} data-level="info" aria-hidden>
            <Info size={14} />
          </span>
          <span className={`${s.kpiVal} ${s.kpiValInfo}`}>{infoCount.toLocaleString('fa-IR')}</span>
          <span className={s.kpiLabel}>اطلاعات</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={s.kpiIcon} data-level="warning" aria-hidden>
            <AlertTriangle size={14} />
          </span>
          <span className={`${s.kpiVal} ${s.kpiValWarning}`}>
            {warnCount.toLocaleString('fa-IR')}
          </span>
          <span className={s.kpiLabel}>هشدار</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={s.kpiIcon} data-level="error" aria-hidden>
            <AlertCircle size={14} />
          </span>
          <span className={`${s.kpiVal} ${s.kpiValError}`}>{errCount.toLocaleString('fa-IR')}</span>
          <span className={s.kpiLabel}>خطا</span>
        </div>
      </div>

      {/* ── Table ── */}
      {logs.length === 0 ? (
        <EmptyState
          icon={Terminal}
          title="لاگی یافت نشد"
          description="با فیلتر انتخابی، رویدادی ثبت نشده است."
        />
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table} aria-label="لاگ‌های سیستم">
            <thead>
              <tr>
                <th className={s.th} style={{ width: '100px' }}>
                  سطح
                </th>
                <th className={s.th}>پیام</th>
                <th className={s.th} style={{ width: '120px' }}>
                  منبع
                </th>
                <th className={s.th} style={{ width: '160px' }}>
                  زمان
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const meta = getLevelMeta(log.level);
                return (
                  <tr key={log.id} className={s.tr} style={{ '--row-i': i } as React.CSSProperties}>
                    <td className={s.td}>
                      <span className={`${s.levelBadge} ${meta.css}`}>
                        {meta.icon}
                        {meta.label}
                      </span>
                    </td>
                    <td className={s.td}>
                      <p className={s.message}>{log.message}</p>
                    </td>
                    <td className={s.td}>
                      <span className={s.source}>{log.source}</span>
                    </td>
                    <td className={s.td}>
                      <time className={s.time} dateTime={new Date(log.timestamp).toISOString()}>
                        {new Date(log.timestamp).toLocaleString('fa-IR')}
                      </time>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
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
              disabled={page === 1}
              aria-label="صفحه قبلی"
            >
              <ChevronRight size={14} aria-hidden />
              قبلی
            </Button>
            <span className={s.pageNum}>
              {page.toLocaleString('fa-IR')} / {totalPages.toLocaleString('fa-IR')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * LIMIT >= total}
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
