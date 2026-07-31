'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toPersianDigits } from '@/lib/setup/format';
import s from '../jobs.module.css';

export interface JobTableRow {
  id: string;
  type: string;
  queue: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'dead';
  priority: number;
  attempts: number;
  maxAttempts: number;
  updatedAt: string;
  errorMessage?: string | null;
}

export interface JobTableProps {
  rows: JobTableRow[];
  total: number;
}

type StatusFilter = 'all' | JobTableRow['status'];
type QueueFilter = 'all' | string;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'همه' },
  { key: 'running', label: 'در حال اجرا' },
  { key: 'pending', label: 'منتظر' },
  { key: 'failed', label: 'خطا' },
  { key: 'dead', label: 'مرده' },
  { key: 'completed', label: 'تکمیل' },
];

const STATUS_LABEL: Record<JobTableRow['status'], string> = {
  pending: 'منتظر',
  running: 'در حال اجرا',
  completed: 'تکمیل',
  failed: 'خطا',
  dead: 'مرده',
};

const STATUS_CLASS: Record<JobTableRow['status'], string> = {
  pending: 'tableStatus--pending',
  running: 'tableStatus--running',
  completed: 'tableStatus--completed',
  failed: 'tableStatus--failed',
  dead: 'tableStatus--dead',
};

const STATUS_DOT_RUNNING_CLASS: Record<JobTableRow['status'], string> = {
  pending: '',
  running: 'tableStatusDot--running',
  completed: '',
  failed: '',
  dead: '',
};

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${toPersianDigits(sec)} ث پیش`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${toPersianDigits(min)} د پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${toPersianDigits(hr)} س پیش`;
  const day = Math.floor(hr / 24);
  return `${toPersianDigits(day)} ر پیش`;
}

function priorityIndicator(p: number): { label: string; cls: string } {
  if (p > 0) return { label: `↑ ${toPersianDigits(p)}`, cls: 'tablePriority--high' };
  if (p < 0) return { label: `↓ ${toPersianDigits(Math.abs(p))}`, cls: 'tablePriority--low' };
  return { label: '۰', cls: '' };
}

export function JobTable({ rows, total }: JobTableProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');

  const queues = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.queue);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (queueFilter !== 'all' && r.queue !== queueFilter) return false;
      if (q) {
        if (
          !r.type.toLowerCase().includes(q) &&
          !r.queue.toLowerCase().includes(q) &&
          !r.id.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [rows, query, statusFilter, queueFilter]);

  return (
    <div className={s.card}>
      <div className={s.tableToolbar}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجو در نوع، صف یا شناسه…"
          className={s.tableSearch}
          style={{
            background: 'var(--ds-surface-1)',
            border: '1px solid var(--ds-border-subtle)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--ds-text-strong)',
            fontFamily: 'inherit',
          }}
          aria-label="جست‌وجوی job"
        />
        <div className={s.tableFilters}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={
                statusFilter === f.key
                  ? `${s.tableFilterPill} ${s['tableFilterPill--active']}`
                  : s.tableFilterPill
              }
              onClick={() => setStatusFilter(f.key)}
              aria-pressed={statusFilter === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>
        {queues.length > 1 ? (
          <select
            value={queueFilter}
            onChange={(e) => setQueueFilter(e.target.value)}
            className={s.tableFilterPill}
            style={{ appearance: 'none', paddingInlineEnd: 24 }}
            aria-label="فیلتر صف"
          >
            <option value="all">همه صف‌ها</option>
            {queues.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        ) : null}
        <span className={s.tableMeta}>
          {toPersianDigits(filtered.length)} از {toPersianDigits(total)}
        </span>
      </div>

      <div className={s.tableHead} role="row">
        <span>نوع job</span>
        <span>صف</span>
        <span>وضعیت</span>
        <span>اولویت</span>
        <span>تلاش</span>
        <span>بروزرسانی</span>
      </div>

      <div className={s.tableBody}>
        {filtered.length === 0 ? (
          <p className={s.tableEmpty}>
            موردی با این فیلترها یافت نشد.
          </p>
        ) : (
          filtered.map((r) => {
            const pr = priorityIndicator(r.priority);
            const attemptsClass =
              r.attempts >= r.maxAttempts
                ? 'tableAttempts--danger'
                : r.attempts > 1
                  ? 'tableAttempts--warning'
                  : '';
            return (
              <Link
                key={r.id}
                href={`/dashboard/jobs/${r.id}`}
                className={s.tableRow}
                role="row"
              >
                <div className={s.tableCellType}>
                  <span className={s.tableType}>{r.type}</span>
                  <span className={s.tableTypeId}>{r.id.slice(0, 8)}</span>
                </div>
                <span className={`${s.tableCell} ${s['tableCell--queue']}`}>
                  {r.queue}
                </span>
                <span>
                  <span
                    className={`${s.tableStatus} ${s[STATUS_CLASS[r.status]]}`}
                  >
                    <span
                      className={`${s.tableStatusDot} ${s[STATUS_DOT_RUNNING_CLASS[r.status]]}`}
                    />
                    {STATUS_LABEL[r.status]}
                  </span>
                </span>
                <span className={`${s.tablePriority} ${s[pr.cls]}`}>
                  {pr.label}
                </span>
                <span className={`${s.tableAttempts} ${s[attemptsClass]}`}>
                  {toPersianDigits(r.attempts)}/{toPersianDigits(r.maxAttempts)}
                </span>
                <span className={s.tableTime}>{formatRelative(r.updatedAt)}</span>
              </Link>
            );
          })
        )}
      </div>

      <div className={s.tableFooter}>
        <span>
          نمایش {toPersianDigits(filtered.length)} مورد · کلیک روی هر ردیف = جزئیات کامل
        </span>
        <Link
          href="/dashboard/jobs/new"
          style={{ color: 'oklch(45% 0.10 162)', fontWeight: 600, textDecoration: 'none' }}
        >
          ساخت job جدید ←
        </Link>
      </div>
    </div>
  );
}

export default JobTable;
