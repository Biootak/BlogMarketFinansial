'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Cpu, ListTree, RefreshCw, Trash2, Zap } from 'lucide-react';
import {
  HubHeader,
  MetricWall,
  type MetricWallTile,
  QueueHeatmap,
  type QueueHeatmapItem,
  ThroughputBars,
  LiveDot,
} from '@/components/Dashboard/PlatformHub';
import s from './Queues.module.css';

type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead';

type Job = {
  id: string;
  type: string;
  queue: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  createdAt: string;
};

type Queue = {
  name: string;
  pending: number;
  running: number;
  failed: number;
};

interface QueuesViewProps {
  jobs: Job[];
  queues: Queue[];
  hourly: number[];
  metrics: {
    pending: number;
    running: number;
    completed24h: number;
    failed24h: number;
    dead: number;
    avgDurationMs: number;
  };
}

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));

export function QueuesView({ jobs, queues, hourly, metrics }: QueuesViewProps) {
  const tiles: MetricWallTile[] = useMemo(() => {
    return [
      {
        id: 'queues',
        label: 'صف‌های فعال',
        value: fmtPersian(queues.length),
        hint: 'صف‌های شناسایی شده',
        tone: 'emerald',
        emphasis: 'hero',
        icon: <ListTree size={18} aria-hidden />,
      },
      {
        id: 'total-pending',
        label: 'در انتظار',
        value: fmtPersian(metrics.pending),
        hint: 'job در صف',
        tone: 'amber',
        icon: <RefreshCw size={16} aria-hidden />,
      },
      {
        id: 'total-running',
        label: 'در حال اجرا',
        value: fmtPersian(metrics.running),
        hint: 'پردازش فعال',
        tone: 'indigo',
        icon: <Cpu size={16} aria-hidden />,
      },
      {
        id: 'total-failed',
        label: 'ناموفق',
        value: fmtPersian(metrics.failed24h),
        hint: '۲۴ ساعت اخیر',
        tone: 'rose',
        icon: <Trash2 size={16} aria-hidden />,
      },
    ];
  }, [queues, metrics]);

  const heatmap: QueueHeatmapItem[] = useMemo(() => {
    const totalLoad = Math.max(
      queues.reduce((s, q) => s + q.pending + q.running, 0),
      1
    );
    return queues.map((q) => {
      const weight = ((q.pending + q.running) / totalLoad) * 100;
      const load = Math.min(1, (q.running + q.failed) / Math.max(q.pending + q.running + q.failed, 1));
      return {
        name: q.name,
        weight,
        load,
        pending: q.pending,
        running: q.running,
        failed: q.failed,
      };
    });
  }, [queues]);

  const totalWeight = queues.reduce((s, q) => s + q.pending + q.running + q.failed, 0);

  const grouped: Record<string, Job[]> = useMemo(() => {
    const g: Record<string, Job[]> = {};
    for (const j of jobs) {
      (g[j.queue] ??= []).push(j);
    }
    return g;
  }, [jobs]);

  return (
    <div dir="rtl" className={s.page}>
      <HubHeader
        backHref="/dashboard/jobs"
        backLabel="بازگشت به مرکز Job"
        title="آمار صف‌ها"
        subtitle="جزئیات هر صف — توزیع کار، نرخ شکست، و فشار لحظه‌ای."
        icon={ListTree}
        actions={
          <Link href="/dashboard/jobs" className={s.linkBtn}>
            <ArrowLeft size={14} aria-hidden />
            مرکز Job
          </Link>
        }
      />

      <MetricWall tiles={tiles} />

      <div className={s.throughputCard}>
        <div className={s.cardHead}>
          <div>
            <div className={s.cardEyebrow}>رودخانه توان</div>
            <h3 className={s.cardTitle}>توان ۲۴ ساعت</h3>
          </div>
          <LiveDot tone="emerald" size="sm" label="همین لحظه" />
        </div>
        <ThroughputBars values={hourly} tone="emerald" height={160} />
      </div>

      <section className={s.queuesList}>
        <div className={s.cardHead}>
          <div>
            <div className={s.cardEyebrow}>صف‌ها</div>
            <h3 className={s.cardTitle}>جزئیات هر صف</h3>
          </div>
          <span className={s.total}>
            <Zap size={12} aria-hidden /> مجموع {fmtPersian(totalWeight)} job
          </span>
        </div>
        <QueueHeatmap items={heatmap} />
      </section>

      <section className={s.groupedList}>
        <h3 className={s.cardTitle}>Jobها به تفکیک صف</h3>
        {queues.length === 0 ? (
          <div className={s.empty}>هیچ صف فعالی یافت نشد.</div>
        ) : (
          queues.map((q) => {
            const items = grouped[q.name] ?? [];
            return (
              <div key={q.name} className={s.queueGroup}>
                <div className={s.queueGroupHead}>
                  <span className={s.queueGroupName}>{q.name}</span>
                  <span className={s.queueGroupMeta}>
                    <span>+{fmtPersian(q.pending)}</span>
                    <span>·{fmtPersian(q.running)}◉</span>
                    {q.failed > 0 ? <span className={s.failed}>!{fmtPersian(q.failed)}</span> : null}
                  </span>
                </div>
                {items.length === 0 ? (
                  <div className={s.emptyMini}>هیچ job‌ای در این صف</div>
                ) : (
                  <ul className={s.miniList}>
                    {items.slice(0, 6).map((j) => (
                      <li key={j.id} className={s.miniItem} data-status={j.status}>
                        <span className={s.miniStatus} />
                        <span className={s.miniType}>{j.type}</span>
                        <span className={s.miniMeta}>
                          {j.attempts > 1 ? `×${j.attempts}` : ''}
                        </span>
                      </li>
                    ))}
                    {items.length > 6 ? (
                      <li className={s.moreItems}>+ {fmtPersian(items.length - 6)} مورد دیگر</li>
                    ) : null}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
