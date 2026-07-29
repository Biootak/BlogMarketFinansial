'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  Clock,
  Hash,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Timer,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

import { Spotlight } from '@/components/Dashboard/primitives/Spotlight';
import type { JobSnapshot, JobStatus, JobSummary } from '@/lib/jobs';
import { cancelJob, retryJob } from '@/lib/jobs';
import s from './JobCenter.module.css';

interface Props {
  initialData?: JobSnapshot;
}

type Filter = 'all' | JobStatus;

const FILTERS: { id: Filter; label: string; tone?: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'pending', label: 'منتظر', tone: 'amber' },
  { id: 'running', label: 'در حال اجرا', tone: 'cyan' },
  { id: 'completed', label: 'موفق', tone: 'emerald' },
  { id: 'failed', label: 'ناموفق', tone: 'rose' },
  { id: 'dead', label: 'مرده (DLQ)', tone: 'rose' },
];

const STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'منتظر',
  running: 'در حال اجرا',
  completed: 'موفق',
  failed: 'ناموفق',
  dead: 'مرده',
};

const STATUS_TONE: Record<JobStatus, string> = {
  pending: 'amber',
  running: 'cyan',
  completed: 'emerald',
  failed: 'rose',
  dead: 'rose',
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)} ثانیه پیش`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} دقیقه پیش`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ساعت پیش`;
  return d.toLocaleString('fa-IR');
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${formatNumber(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function StatusPill({ status }: { status: JobStatus }) {
  return (
    <span className={s.statusPill} data-tone={STATUS_TONE[status]}>
      {status === 'running' ? (
        <Loader2 className={`h-3 w-3 ${s.spin}`} />
      ) : status === 'completed' ? (
        <Check className="h-3 w-3" />
      ) : status === 'failed' || status === 'dead' ? (
        <X className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

function JobRow({
  job,
  onCancel,
  onRetry,
}: {
  job: JobSummary;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  return (
    <tr className={s.row}>
      <td>
        <code className={s.typeCode}>{job.type}</code>
        <div className={s.queueCode}>{job.queue}</div>
      </td>
      <td>
        <StatusPill status={job.status} />
      </td>
      <td className={s.numeric}>
        {job.attempts} / {job.maxAttempts}
      </td>
      <td className={s.numeric}>
        {job.priority > 0 ? <span className={s.priorityChip}>+{job.priority}</span> : '—'}
      </td>
      <td className={s.errorCell} title={job.errorMessage ?? ''}>
        {job.errorMessage ? (
          <span className={s.errorMsg}>{job.errorMessage.slice(0, 60)}</span>
        ) : (
          '—'
        )}
      </td>
      <td className={s.timeCell}>{formatTime(job.completedAt ?? job.failedAt ?? job.startedAt ?? job.createdAt)}</td>
      <td>
        <div className={s.actions}>
          {job.status === 'pending' || job.status === 'running' ? (
            <button
              type="button"
              onClick={() => onCancel(job.id)}
              className={s.actionDanger}
              title="لغو"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {job.status === 'failed' || job.status === 'dead' ? (
            <button
              type="button"
              onClick={() => onRetry(job.id)}
              className={s.actionPrimary}
              title="تلاش مجدد"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function QueueBar({
  name,
  pending,
  running,
  failed,
}: {
  name: string;
  pending: number;
  running: number;
  failed: number;
}) {
  const total = pending + running + failed;
  if (total === 0) return null;
  const pPct = (pending / total) * 100;
  const rPct = (running / total) * 100;
  const fPct = (failed / total) * 100;
  return (
    <div className={s.queueBar}>
      <div className={s.queueHead}>
        <span className={s.queueName}>{name}</span>
        <span className={s.queueCount}>{formatNumber(total)}</span>
      </div>
      <div className={s.queueTrack}>
        <span className={s.queueSeg} data-tone="amber" style={{ width: `${pPct}%` }} />
        <span className={s.queueSeg} data-tone="cyan" style={{ width: `${rPct}%` }} />
        <span className={s.queueSeg} data-tone="rose" style={{ width: `${fPct}%` }} />
      </div>
    </div>
  );
}

export function JobCenter({ initialData }: Props) {
  const [data, setData] = useState<JobSnapshot | undefined>(initialData);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/jobs/snapshot', { cache: 'no-store' });
      const json = (await res.json()) as { success: boolean; data?: JobSnapshot };
      if (json.success && json.data) setData(json.data);
    } catch {
      /* silent */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      void fetchData();
    }, 20_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.jobs.filter((j) => {
      if (filter !== 'all' && j.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !j.type.toLowerCase().includes(q) &&
          !j.queue.toLowerCase().includes(q) &&
          !(j.errorMessage?.toLowerCase().includes(q) ?? false)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [data, filter, search]);

  const handleCancel = async (id: string) => {
    await cancelJob(id);
    void fetchData();
  };
  const handleRetry = async (id: string) => {
    await retryJob(id);
    void fetchData();
  };

  if (!data) {
    return (
      <div className={s.empty}>
        <Zap className="h-10 w-10" />
        <p>داده‌ای موجود نیست.</p>
      </div>
    );
  }

  const m = data.metrics;
  const maxHourly = Math.max(...data.hourly, 1);

  return (
    <div className={s.root}>
      <Spotlight tone="amber" />

      {/* Summary */}
      <section className={s.summary}>
        <div className={s.summaryCard} data-tone="amber">
          <div className={s.summaryLabel}>منتظر</div>
          <div className={s.summaryValue}>{formatNumber(m.pending)}</div>
          <Clock className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="cyan">
          <div className={s.summaryLabel}>در حال اجرا</div>
          <div className={s.summaryValue}>{formatNumber(m.running)}</div>
          <Activity className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="emerald">
          <div className={s.summaryLabel}>موفق (۲۴ ساعت)</div>
          <div className={s.summaryValue}>{formatNumber(m.completed24h)}</div>
          <Check className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="rose">
          <div className={s.summaryLabel}>ناموفق (۲۴ ساعت)</div>
          <div className={s.summaryValue}>{formatNumber(m.failed24h)}</div>
          <AlertCircle className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="rose">
          <div className={s.summaryLabel}>DLQ</div>
          <div className={s.summaryValue}>{formatNumber(m.dead)}</div>
          <Trash2 className={s.summaryIcon} />
        </div>
      </section>

      {/* Throughput + Queues */}
      <div className={s.dualGrid}>
        <section className={s.throughputCard}>
          <header className={s.cardHeader}>
            <h2>
              <Zap className="h-4 w-4" /> توان عملیاتی
            </h2>
            <p>jobهای تکمیل‌شده در ۲۴ ساعت گذشته — میانگین: {formatMs(m.avgDurationMs)}</p>
          </header>
          <div className={s.bars}>
            {data.hourly.map((v, i) => {
              const h = (v / maxHourly) * 100;
              return (
                <div key={i} className={s.bar} title={`${formatNumber(v)}`}>
                  <span
                    className={s.barFill}
                    style={{ height: `${Math.max(h, v > 0 ? 4 : 0)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className={s.queuesCard}>
          <header className={s.cardHeader}>
            <h2>
              <Hash className="h-4 w-4" /> صف‌ها
            </h2>
            <p>{formatNumber(data.queues.length)} صف فعال</p>
          </header>
          <div className={s.queueList}>
            {data.queues.length === 0 ? (
              <div className={s.emptyMini}>صف فعالی نیست</div>
            ) : (
              data.queues.map((q) => (
                <QueueBar
                  key={q.name}
                  name={q.name}
                  pending={q.pending}
                  running={q.running}
                  failed={q.failed}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Filters + Table */}
      <section className={s.tableCard}>
        <header className={s.tableHead}>
          <div className={s.filters}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={s.filterBtn}
                data-active={filter === f.id}
                data-tone={f.tone}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className={s.searchBox}>
            <Search className="h-4 w-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در type، queue یا خطا..."
              className={s.searchInput}
              dir="rtl"
            />
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className={s.empty}>
            <Zap className="h-10 w-10" />
            <p>jobای با این فیلتر یافت نشد.</p>
          </div>
        ) : (
          <div className={s.tableScroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>نوع / صف</th>
                  <th>وضعیت</th>
                  <th>تلاش</th>
                  <th>اولویت</th>
                  <th>خطا</th>
                  <th>زمان</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => (
                  <JobRow key={j.id} job={j} onCancel={handleCancel} onRetry={handleRetry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
