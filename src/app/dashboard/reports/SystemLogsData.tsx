'use client';

/**
 * SystemLogsData 2026 — Terminal-Pro Viewer
 * ─ Header bar با level filter + live badge
 * ─ Log rows با monospace source + severity ring
 * ─ DS tokens only · RTL-safe · no hex
 */

import { getSystemLogs } from '@/actions/reportActions';
import { MillionDollarEmpty } from '@/components/Dashboard/primitives/MillionDollarEmpty';
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
  Circle,
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

interface LevelMeta {
  label: string;
  icon: React.ReactNode;
  css: string;
  dotCss: string;
}

const LEVEL_META: Record<LogLevel, LevelMeta> = {
  ERROR: {
    label: 'خطا',
    icon: <AlertCircle size={13} aria-hidden />,
    css: s.levelError,
    dotCss: s.dotError,
  },
  WARNING: {
    label: 'هشدار',
    icon: <AlertTriangle size={13} aria-hidden />,
    css: s.levelWarning,
    dotCss: s.dotWarning,
  },
  INFO: {
    label: 'اطلاعات',
    icon: <Info size={13} aria-hidden />,
    css: s.levelInfo,
    dotCss: s.dotInfo,
  },
};

function getLevelMeta(level: string): LevelMeta {
  return (
    LEVEL_META[level.toUpperCase() as LogLevel] ?? {
      label: level,
      icon: <Circle size={13} aria-hidden />,
      css: s.levelDefault,
      dotCss: s.dotDefault,
    }
  );
}

export default function SystemLogsData() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [level, setLevel] = useState('all');
  const LIMIT = 12;

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

  return (
    <div className={s.root} dir="rtl">
      {/* ── Terminal Header Bar ── */}
      <div className={s.termBar}>
        <div className={s.termBarLeft}>
          {/* Traffic lights */}
          <span className={s.termDots} aria-hidden>
            <span className={s.termDot} data-color="red" />
            <span className={s.termDot} data-color="yellow" />
            <span className={s.termDot} data-color="green" />
          </span>
          <span className={s.termIcon} aria-hidden>
            <Terminal size={15} />
          </span>
          <div>
            <p className={s.termTitle}>لاگ‌های سیستم</p>
            <p className={s.termSub}>System Event Log Viewer</p>
          </div>
        </div>

        <div className={s.termBarRight}>
          {/* Level pill counters */}
          <span className={`${s.levelPill} ${s.levelPillError}`} aria-label={`${errCount} خطا`}>
            <AlertCircle size={11} aria-hidden />
            <span>{errCount.toLocaleString('fa-IR')}</span>
          </span>
          <span className={`${s.levelPill} ${s.levelPillWarn}`} aria-label={`${warnCount} هشدار`}>
            <AlertTriangle size={11} aria-hidden />
            <span>{warnCount.toLocaleString('fa-IR')}</span>
          </span>
          <span className={`${s.levelPill} ${s.levelPillInfo}`} aria-label={`${infoCount} اطلاعات`}>
            <Info size={11} aria-hidden />
            <span>{infoCount.toLocaleString('fa-IR')}</span>
          </span>

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

      {/* ── Log Body ── */}
      <div className={s.termBody}>
        {loading ? (
          <div className={s.loadRows}>
            {Array.from({ length: 6 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static
              <div key={i} className={s.skRow} style={{ '--sk-i': i } as React.CSSProperties} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <MillionDollarEmpty
            variant="default"
            tone="neutral"
            eyebrow="لاگ سیستم"
            title="لاگی یافت نشد"
            description="با فیلتر انتخابی، رویدادی ثبت نشده است."
          />
        ) : (
          <div className={s.logList} role="log" aria-live="polite" aria-label="لاگ‌های سیستم">
            {logs.map((log, i) => {
              const meta = getLevelMeta(log.level);
              return (
                <div
                  key={log.id}
                  className={s.logRow}
                  style={{ '--row-i': i } as React.CSSProperties}
                >
                  {/* Severity dot */}
                  <span className={`${s.severityDot} ${meta.dotCss}`} aria-hidden />

                  {/* Level badge */}
                  <span className={`${s.levelBadge} ${meta.css}`} aria-label={`سطح: ${meta.label}`}>
                    {meta.icon}
                    <span>{meta.label}</span>
                  </span>

                  {/* Message */}
                  <p className={s.logMsg}>{log.message}</p>

                  {/* Source */}
                  <span className={s.logSource}>{log.source}</span>

                  {/* Time */}
                  <time
                    className={s.logTime}
                    dateTime={new Date(log.timestamp).toISOString()}
                    title={new Date(log.timestamp).toLocaleString('fa-IR')}
                  >
                    {new Date(log.timestamp).toLocaleTimeString('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </time>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className={s.pagination}>
          <span className={s.paginationInfo}>
            <span className={s.paginationTotal}>{total.toLocaleString('fa-IR')}</span> رویداد کل
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
