'use client';

/**
 * AuditLog — نمایش رویدادهای ثبت‌شده.
 * ─────────────────────────────────────────────────────────────
 *  Features:
 *    - pagination (50 per page)
 *    - filter: action, actorId, severity, date range
 *    - JSON details collapsible
 *    - severity color-coding
 *
 *  نکته: داده‌های بزرگ به صورت server-side pagination لود می‌شوند.
 */

import { queryAuditLogs } from '@/actions/settingsActions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActionToast } from '@/hooks/useActionToast';
import { ChevronRight, Filter, Loader2, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import s from './AuditLog.module.css';

interface AuditRow {
  id: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
}

const SEVERITY_LABELS: Record<AuditRow['severity'], string> = {
  info: 'معمولی',
  warn: 'هشدار',
  error: 'خطا',
  critical: 'بحرانی',
};

export function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [actionFilter, setActionFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'' | AuditRow['severity']>('');
  const [actorFilter, setActorFilter] = useState('');
  const toast = useActionToast();

  const load = async () => {
    setLoading(true);
    const res = await queryAuditLogs({
      page,
      pageSize,
      action: actionFilter || undefined,
      actorId: actorFilter || undefined,
      severity: severityFilter || undefined,
    });
    if (res.success && res.data) {
      setRows(res.data.rows);
      setTotal(res.data.total);
    } else if (!res.success) {
      toast.error(typeof res.error === 'string' ? res.error : 'خطا در دریافت');
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const onSearch = () => {
    setPage(1);
    void load();
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={s.wrap}>
      {/* Filters */}
      <section className={s.filters}>
        <div className={s.filterGroup}>
          <Filter size={14} strokeWidth={2} aria-hidden />
          <span className={s.filterLabel}>فیلتر</span>
        </div>
        <div className={s.filterFields}>
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="عملیات (مثلاً: API_KEY_CREATED)"
            className={s.filterInput}
            dir="ltr"
          />
          <input
            type="text"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            placeholder="شناسه کاربر"
            className={s.filterInput}
            dir="ltr"
          />
          <Select
            value={severityFilter || 'all'}
            onValueChange={(v) =>
              setSeverityFilter(v === 'all' ? '' : (v as typeof severityFilter))
            }
          >
            <SelectTrigger className={s.filterSelect} aria-label="فیلتر سطح">
              <SelectValue placeholder="همه سطوح" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه سطوح</SelectItem>
              <SelectItem value="info">معمولی</SelectItem>
              <SelectItem value="warn">هشدار</SelectItem>
              <SelectItem value="error">خطا</SelectItem>
              <SelectItem value="critical">بحرانی</SelectItem>
            </SelectContent>
          </Select>
          <button type="button" onClick={onSearch} className={s.searchBtn}>
            <Search size={13} strokeWidth={2.2} />
            <span>اعمال</span>
          </button>
          <button type="button" onClick={load} className={s.refreshBtn} disabled={loading}>
            <RefreshCw size={13} strokeWidth={2} className={loading ? s.spin : ''} />
          </button>
        </div>
      </section>

      {/* List */}
      <section className={s.listSection}>
        {loading && rows.length === 0 ? (
          <div className={s.loading}>
            <Loader2 size={18} className={s.spin} />
            <span>در حال بارگذاری…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className={s.empty}>رویدادی یافت نشد</div>
        ) : (
          <ul className={s.list}>
            {rows.map((row) => {
              const isOpen = expanded.has(row.id);
              return (
                <li key={row.id} className={s.row} data-severity={row.severity}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(row.id)}
                    className={s.rowHead}
                    aria-expanded={isOpen}
                  >
                    <span className={s.severityDot} aria-hidden />
                    <span className={s.action}>{row.action}</span>
                    <span className={s.severityLabel}>{SEVERITY_LABELS[row.severity]}</span>
                    <span className={s.userId} dir="ltr">
                      {row.userId.slice(0, 12)}…
                    </span>
                    <time className={s.time} dateTime={row.createdAt}>
                      {new Date(row.createdAt).toLocaleString('fa-IR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </time>
                    <span className={s.chevron} data-open={isOpen} aria-hidden>
                      <ChevronRight size={14} strokeWidth={2} />
                    </span>
                  </button>
                  {isOpen && (
                    <pre className={s.details} dir="ltr">
                      {formatDetails(row.details)}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Pagination */}
      {total > pageSize && (
        <footer className={s.pagination}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={s.pageBtn}
          >
            قبلی
          </button>
          <span className={s.pageInfo}>
            صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={s.pageBtn}
          >
            بعدی
          </button>
        </footer>
      )}

      {total > 0 && <p className={s.total}>مجموع: {total.toLocaleString('fa-IR')} رویداد</p>}
    </div>
  );
}

function formatDetails(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}
