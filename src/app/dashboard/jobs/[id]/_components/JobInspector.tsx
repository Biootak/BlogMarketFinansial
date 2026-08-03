'use client';

import { cancelJob, retryJob } from '@/actions/jobs-actions';
import type { JobDetail, JobLifecycleEvent } from '@/lib/jobs';
import { toPersianDigits } from '@/lib/setup/format';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Hourglass,
  PlayCircle,
  RefreshCw,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import s from '../../jobs.module.css';

type Status = JobDetail['status'];

const STATUS_META: Record<
  Status,
  { label: string; tone: 'emerald' | 'indigo' | 'amber' | 'rose' }
> = {
  completed: { label: 'تکمیل شده', tone: 'emerald' },
  running: { label: 'در حال اجرا', tone: 'indigo' },
  pending: { label: 'در صف', tone: 'amber' },
  failed: { label: 'ناموفق', tone: 'rose' },
  dead: { label: 'صف مرده', tone: 'rose' },
};

const STAGE_META: Record<
  JobLifecycleEvent['stage'],
  { label: string; tone: string; Icon: typeof Clock }
> = {
  created: { label: 'ساخته شد', tone: 'neutral', Icon: PlayCircle },
  scheduled: { label: 'زمان‌بندی شد', tone: 'amber', Icon: Hourglass },
  started: { label: 'شروع شد', tone: 'indigo', Icon: PlayCircle },
  retried: { label: 'تلاش مجدد', tone: 'amber', Icon: RefreshCw },
  completed: { label: 'تکمیل شد', tone: 'emerald', Icon: CheckCircle2 },
  failed: { label: 'ناموفق', tone: 'rose', Icon: XCircle },
  cancelled: { label: 'لغو شد', tone: 'rose', Icon: Trash2 },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${toPersianDigits(Math.round(ms))} میلی‌ثانیه`;
  if (ms < 60_000) return `${toPersianDigits((ms / 1000).toFixed(1))} ثانیه`;
  if (ms < 3_600_000) return `${toPersianDigits(Math.round(ms / 60_000))} دقیقه`;
  return `${toPersianDigits((ms / 3_600_000).toFixed(1))} ساعت`;
}

function fmtJson(value: unknown): string {
  if (value === null || value === undefined) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function JobInspector({ job }: { job: JobDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const meta = STATUS_META[job.status];
  const durationMs = useMemo(() => {
    if (job.startedAt && job.completedAt) {
      return new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime();
    }
    if (job.startedAt && job.failedAt) {
      return new Date(job.failedAt).getTime() - new Date(job.startedAt).getTime();
    }
    return null;
  }, [job]);

  function handleRetry() {
    setActionError(null);
    startTransition(async () => {
      const res = await retryJob(job.id);
      if (res.success) {
        router.refresh();
      } else {
        setActionError(res.message ?? 'خطا در تلاش مجدد');
      }
    });
  }

  function handleCancel() {
    if (!confirm('این job لغو می‌شود. مطمئن هستید؟')) return;
    setActionError(null);
    startTransition(async () => {
      const res = await cancelJob(job.id);
      if (res.success) {
        router.refresh();
      } else {
        setActionError(res.message ?? 'خطا در لغو job');
      }
    });
  }

  return (
    <article className={s.inspector}>
      <nav className={s.inspectorBack}>
        <Link href="/dashboard/jobs" className={s.inspectorBackLink}>
          <ArrowLeft size={14} aria-hidden />
          بازگشت به مرکز Job
        </Link>
      </nav>

      <header className={s.inspectorHeader}>
        <div className={s.inspectorHeadMain}>
          <div className={s.inspectorEyebrow}>
            <span className={`${s.statusPill} ${s[`statusPill--${meta.tone}`]}`}>
              <span className={s.statusPillDot} />
              {meta.label}
            </span>
            <span className={s.inspectorSep}>·</span>
            <span className={s.inspectorQueue}>{job.queue}</span>
            <span className={s.inspectorSep}>·</span>
            <span className={s.inspectorMono}>{job.id.slice(0, 12)}</span>
          </div>
          <h1 className={s.inspectorTitle}>{job.type}</h1>
          <p className={s.inspectorLead}>
            ساخته شده در {fmtDate(job.createdAt)}
            {job.triggeredBy ? ` توسط ${job.triggeredBy}` : ''}
          </p>
        </div>

        <div className={s.inspectorActions}>
          {job.status !== 'completed' && job.status !== 'running' ? (
            <button
              type="button"
              onClick={handleRetry}
              disabled={pending}
              className={`${s.inspectorBtn} ${s['inspectorBtn--primary']}`}
            >
              <RefreshCw size={14} aria-hidden />
              تلاش مجدد
            </button>
          ) : null}
          {job.status !== 'dead' ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className={`${s.inspectorBtn} ${s['inspectorBtn--danger']}`}
            >
              <Trash2 size={14} aria-hidden />
              لغو
            </button>
          ) : null}
        </div>
      </header>

      {actionError ? (
        <div className={s.inspectorError}>
          <AlertTriangle size={14} aria-hidden />
          {actionError}
        </div>
      ) : null}

      <section className={s.inspectorFacts}>
        <div className={s.inspectorFact}>
          <span className={s.inspectorFactLabel}>اولویت</span>
          <span className={s.inspectorFactValue}>
            {job.priority > 0 ? `+${toPersianDigits(job.priority)}` : toPersianDigits(job.priority)}
          </span>
        </div>
        <div className={s.inspectorFact}>
          <span className={s.inspectorFactLabel}>تلاش</span>
          <span className={s.inspectorFactValue}>
            {toPersianDigits(job.attempts)} / {toPersianDigits(job.maxAttempts)}
          </span>
        </div>
        <div className={s.inspectorFact}>
          <span className={s.inspectorFactLabel}>مدت</span>
          <span className={s.inspectorFactValue}>
            {durationMs != null ? fmtDuration(durationMs) : '—'}
          </span>
        </div>
        <div className={s.inspectorFact}>
          <span className={s.inspectorFactLabel}>زمان‌بندی</span>
          <span className={s.inspectorFactValue}>
            {job.scheduledAt ? fmtDate(job.scheduledAt) : 'فوری'}
          </span>
        </div>
        <div className={s.inspectorFact}>
          <span className={s.inspectorFactLabel}>شروع</span>
          <span className={s.inspectorFactValue}>
            {job.startedAt ? fmtDate(job.startedAt) : '—'}
          </span>
        </div>
        <div className={s.inspectorFact}>
          <span className={s.inspectorFactLabel}>پایان</span>
          <span className={s.inspectorFactValue}>
            {job.completedAt
              ? fmtDate(job.completedAt)
              : job.failedAt
                ? fmtDate(job.failedAt)
                : '—'}
          </span>
        </div>
      </section>

      <div className={s.inspectorGrid}>
        <section className={s.inspectorPanel}>
          <header className={s.inspectorPanelHead}>
            <Clock size={14} aria-hidden />
            <h2 className={s.inspectorPanelTitle}>تایم‌لاین</h2>
          </header>
          <ol className={s.timeline}>
            {job.lifecycle.map((event, idx) => {
              const stageMeta = STAGE_META[event.stage];
              const Icon = stageMeta.Icon;
              return (
                <li key={idx} className={s.timelineItem}>
                  <span className={`${s.timelineDot} ${s[`timelineDot--${stageMeta.tone}`]}`}>
                    <Icon size={12} aria-hidden />
                  </span>
                  <div className={s.timelineBody}>
                    <div className={s.timelineHead}>
                      <span className={s.timelineLabel}>{stageMeta.label}</span>
                      <span className={s.timelineTime}>{fmtDate(event.at)}</span>
                    </div>
                    {event.detail ? <p className={s.timelineDetail}>{event.detail}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={s.inspectorPanel}>
          <header className={s.inspectorPanelHead}>
            <Zap size={14} aria-hidden />
            <h2 className={s.inspectorPanelTitle}>Payload</h2>
          </header>
          <pre className={s.codeBlock} dir="ltr">
            {fmtJson(job.payload)}
          </pre>
        </section>

        {job.status === 'completed' ? (
          <section className={s.inspectorPanel}>
            <header className={s.inspectorPanelHead}>
              <CheckCircle2 size={14} aria-hidden />
              <h2 className={s.inspectorPanelTitle}>نتیجه</h2>
            </header>
            <pre className={s.codeBlock} dir="ltr">
              {fmtJson(job.result)}
            </pre>
          </section>
        ) : null}

        {(job.status === 'failed' || job.status === 'dead') && job.errorMessage ? (
          <section className={`${s.inspectorPanel} ${s['inspectorPanel--danger']}`}>
            <header className={s.inspectorPanelHead}>
              <AlertTriangle size={14} aria-hidden />
              <h2 className={s.inspectorPanelTitle}>پیام خطا</h2>
            </header>
            <pre className={s.errorBlock} dir="ltr">
              {job.errorMessage}
            </pre>
            {job.errorStack ? (
              <details className={s.inspectorDetails}>
                <summary className={s.inspectorDetailsSummary}>Stack trace</summary>
                <pre className={s.errorBlock} dir="ltr">
                  {job.errorStack}
                </pre>
              </details>
            ) : null}
          </section>
        ) : null}
      </div>
    </article>
  );
}

export default JobInspector;
