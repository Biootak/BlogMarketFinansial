'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Trash2, X } from 'lucide-react';
import {
  HubHeader,
  MetricWall,
  type MetricWallTile,
  type PillTabItem,
  PillTabs,
  LiveDot,
} from '@/components/Dashboard/PlatformHub';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/Dashboard/primitives';
import s from './DLQ.module.css';

type Job = {
  id: string;
  type: string;
  queue: string;
  status: 'dead' | 'failed';
  attempts: number;
  maxAttempts: number;
  startedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  triggeredBy: string | null;
  createdAt: string;
};

interface DLQViewProps {
  jobs: Job[];
  deadCount: number;
  failedCount: number;
}

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));

const TABS: PillTabItem[] = [
  { id: 'dead', label: 'صف مرده' },
  { id: 'failed', label: 'ناموفق‌ها' },
];

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} دقیقه پیش`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ساعت پیش`;
  return `${Math.floor(diff / 86_400_000)} روز پیش`;
}

export function DLQView({ jobs, deadCount, failedCount }: DLQViewProps) {
  const [tab, setTab] = useState<string>('dead');
  const [pending, startTransition] = useTransition();

  const filtered = tab === 'dead' ? jobs.filter((j) => j.status === 'dead') : jobs.filter((j) => j.status === 'failed');

  const tiles: MetricWallTile[] = [
    {
      id: 'dead',
      label: 'صف مرده',
      value: fmtPersian(deadCount),
      hint: 'jobهای نیازمند بررسی',
      tone: 'rose',
      emphasis: 'hero',
      icon: <Trash2 size={18} aria-hidden />,
    },
    {
      id: 'failed',
      label: 'ناموفق',
      value: fmtPersian(failedCount),
      hint: '۲۴ ساعت اخیر',
      tone: 'amber',
      icon: <X size={16} aria-hidden />,
    },
  ];

  async function retry(id: string) {
    startTransition(async () => {
      await fetch(`/api/jobs/${id}/retry`, { method: 'POST' });
    });
  }

  async function discard(id: string) {
    if (!confirm('این job برای همیشه حذف می‌شود. مطمئن هستید؟')) return;
    startTransition(async () => {
      await fetch(`/api/jobs/${id}/cancel`, { method: 'POST' });
    });
  }

  return (
    <div dir="rtl" className={s.page}>
      <HubHeader
        backHref="/dashboard/jobs"
        backLabel="بازگشت به مرکز Job"
        title="صف مرده (DLQ)"
        subtitle="jobهای ناموفق و مرده. این jobها بیشترین حداکثر تلاش را انجام داده‌اند."
        icon={Trash2}
        actions={
          <Link href="/dashboard/jobs" className={s.linkBtn}>
            <ArrowLeft size={14} aria-hidden />
            مرکز Job
          </Link>
        }
      />

      <MetricWall tiles={tiles} />

      <div className={s.tabsRow}>
        <PillTabs tabs={TABS} active={tab} onChange={setTab} ariaLabel="وضعیت" />
        <LiveDot tone="rose" size="sm" label="نیاز به اقدام" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="صف مرده خالی است"
          description="هیچ job ناموفقی برای بررسی وجود ندارد."
          icon={Trash2}
        />
      ) : (
        <ul className={s.list}>
          {filtered.map((j) => (
            <li key={j.id} className={s.item} data-status={j.status}>
              <div className={s.itemHead}>
                <div>
                  <div className={s.itemTitle}>{j.type}</div>
                  <div className={s.itemMeta}>
                    <span className={s.queue}>{j.queue}</span>
                    <span className={s.id}>{j.id.slice(0, 12)}</span>
                    <span>تلاش {fmtPersian(j.attempts)}/{fmtPersian(j.maxAttempts)}</span>
                    {j.triggeredBy ? <span>{j.triggeredBy}</span> : null}
                    <span>{formatRelative(j.failedAt ?? j.createdAt)}</span>
                  </div>
                </div>
                <div className={s.itemActions}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => retry(j.id)}
                    disabled={pending}
                  >
                    <RefreshCw size={14} aria-hidden />
                    تلاش مجدد
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => discard(j.id)}
                    disabled={pending}
                  >
                    <Trash2 size={14} aria-hidden />
                    حذف
                  </Button>
                </div>
              </div>
              {j.errorMessage ? (
                <pre className={s.error}>{j.errorMessage}</pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
