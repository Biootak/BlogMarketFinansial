'use client';

import { useMemo } from 'react';
import { toPersianDigits } from '@/lib/setup/format';
import { JobHero } from './JobHero';
import { JobVitals } from './JobVitals';
import { JobPipeline, type JobPipelineStage } from './JobPipeline';
import { JobQueueMatrix, type QueueHealthDisplay } from './JobQueueMatrix';
import { JobStream, type JobStreamItem } from './JobStream';
import { JobTable, type JobTableRow } from './JobTable';
import s from '../jobs.module.css';

export interface JobCenterProps {
  /** total jobs ever */
  totalJobs: number;
  metrics: {
    pending: number;
    running: number;
    completed24h: number;
    failed24h: number;
    dead: number;
    avgDurationMs: number;
  };
  /** hourly throughput (24 numbers, oldest first) */
  hourly: number[];
  /** queue health */
  queueHealth: QueueHealthDisplay[];
  /** recent jobs (newest first) — used by stream and table */
  recentJobs: Array<{
    id: string;
    type: string;
    queue: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'dead';
    priority: number;
    attempts: number;
    maxAttempts: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
    scheduledAt: string | null;
    errorMessage?: string | null;
  }>;
  /** jobs per minute in last 5 min — for pipeline inflow */
  inflowPerMin: number;
  /** completed per minute in last 5 min — for pipeline outflow */
  outflowPerMin: number;
}

function getStageStatus(
  q: QueueHealthDisplay[],
): 'healthy' | 'degraded' | 'critical' | 'idle' {
  if (q.length === 0) return 'idle';
  if (q.some((x) => x.status === 'critical')) return 'critical';
  if (q.some((x) => x.status === 'degraded')) return 'degraded';
  return 'healthy';
}

export function JobCenter({
  totalJobs,
  metrics,
  hourly,
  queueHealth,
  recentJobs,
  inflowPerMin,
  outflowPerMin,
}: JobCenterProps) {
  const successRate = useMemo(() => {
    const total = metrics.completed24h + metrics.failed24h;
    if (total === 0) return 100;
    return (metrics.completed24h / total) * 100;
  }, [metrics]);

  const health = getStageStatus(queueHealth);

  const pulseValue = useMemo(() => {
    // peak ساعت گذشته — یک anchor واقعی
    const lastHour = hourly.slice(-1)[0] ?? 0;
    return toPersianDigits(lastHour);
  }, [hourly]);

  // براورد trend (مقایسه ۱۲ ساعت اول با ۱۲ ساعت دوم — fallback صفر)
  const failureRateTrend = useMemo(() => {
    if (hourly.length < 2) return 0;
    const half = Math.floor(hourly.length / 2);
    const first = hourly.slice(0, half).reduce((a, b) => a + b, 0);
    const second = hourly.slice(half).reduce((a, b) => a + b, 0);
    if (first === 0) return second > 0 ? 100 : 0;
    return Number((((second - first) / first) * 100).toFixed(1));
  }, [hourly]);

  // تعداد scheduled = آن‌هایی که scheduledAt > now و هنوز pending
  const scheduledCount = useMemo(() => {
    const now = Date.now();
    return recentJobs.filter(
      (j) =>
        j.status === 'pending' && j.scheduledAt && new Date(j.scheduledAt).getTime() > now,
    ).length;
  }, [recentJobs]);

  const stages: JobPipelineStage[] = useMemo(
    () => [
      {
        key: 'scheduled',
        label: 'زمان‌بندی‌شده',
        value: scheduledCount,
        sub: 'منتظر زمان مقرر',
      },
      {
        key: 'pending',
        label: 'در صف',
        value: metrics.pending,
        sub: 'آماده پردازش',
        href: '/dashboard/jobs?status=pending',
      },
      {
        key: 'running',
        label: 'در حال اجرا',
        value: metrics.running,
        sub: 'پردازش فعال',
        href: '/dashboard/jobs?status=running',
      },
      {
        key: 'completed',
        label: 'تکمیل‌شده',
        value: metrics.completed24h,
        sub: 'در ۲۴ ساعت',
        href: '/dashboard/jobs?status=completed',
      },
      {
        key: 'dead',
        label: 'صف مرده',
        value: metrics.dead,
        sub: 'نیاز به بازبینی',
        href: '/dashboard/jobs/dlq',
      },
    ],
    [scheduledCount, metrics],
  );

  const streamItems: JobStreamItem[] = useMemo(
    () =>
      recentJobs.slice(0, 60).map((j) => {
        const updated =
          j.completedAt ?? j.failedAt ?? j.startedAt ?? j.createdAt;
        const durationMs = j.startedAt && j.completedAt
          ? new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime()
          : j.startedAt && j.failedAt
            ? new Date(j.failedAt).getTime() - new Date(j.startedAt).getTime()
            : null;
        return {
          id: j.id,
          type: j.type,
          queue: j.queue,
          status: j.status,
          updatedAt: updated,
          attempts: j.attempts,
          durationMs,
        };
      }),
    [recentJobs],
  );

  const tableRows: JobTableRow[] = useMemo(
    () =>
      recentJobs.map((j) => ({
        id: j.id,
        type: j.type,
        queue: j.queue,
        status: j.status,
        priority: j.priority,
        attempts: j.attempts,
        maxAttempts: j.maxAttempts,
        updatedAt: j.completedAt ?? j.failedAt ?? j.startedAt ?? j.createdAt,
        errorMessage: j.errorMessage ?? null,
      })),
    [recentJobs],
  );

  return (
    <div className={s.page} dir="rtl">
      <JobHero
        health={health}
        totalJobs={totalJobs}
        completed24h={metrics.completed24h}
        failed24h={metrics.failed24h}
        pulseValue={pulseValue}
        pulseUnit="job/h"
        pulseSub="ساعت گذشته"
      />

      <JobVitals
        completed24h={metrics.completed24h}
        pending={metrics.pending}
        running={metrics.running}
        failed24h={metrics.failed24h}
        dead={metrics.dead}
        successRate={successRate}
        avgDurationMs={metrics.avgDurationMs}
        hourly={hourly}
        failureRateTrend={failureRateTrend}
      />

      <JobPipeline
        stages={stages}
        inflowPerMin={inflowPerMin}
        outflowPerMin={outflowPerMin}
      />

      <div className={s.data}>
        <div className={s.matrix}>
          <JobQueueMatrix queues={queueHealth} />
        </div>
        <div className={s.stream}>
          <JobStream items={streamItems} />
        </div>
        <div className={s.table}>
          <JobTable rows={tableRows} total={recentJobs.length} />
        </div>
      </div>
    </div>
  );
}

export default JobCenter;
