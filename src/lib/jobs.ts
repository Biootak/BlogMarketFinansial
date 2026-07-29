/**
 * jobs.ts — مرکز داده‌های Job Center
 * ─────────────────────────────────────────────────────────────
 *  داده‌های واقعی از BackgroundJob (صف، retry، DLQ، cron)
 */

import 'server-only';

import { revalidateTag } from '@/lib/revalidate';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead';
export type JobQueue = 'default' | 'email' | 'sms' | 'market-rates' | 'settlement' | 'kyc' | 'cron';

export interface JobSummary {
  id: string;
  type: string;
  queue: string;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  triggeredBy: string | null;
  payload: unknown;
  result: unknown;
  createdAt: string;
}

export interface JobSnapshot {
  generatedAt: string;
  jobs: JobSummary[];
  metrics: {
    pending: number;
    running: number;
    completed24h: number;
    failed24h: number;
    dead: number;
    avgDurationMs: number;
  };
  queues: Array<{
    name: string;
    pending: number;
    running: number;
    failed: number;
  }>;
  hourly: number[]; // completed در ۲۴ ساعت
}

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, reason: 'احراز هویت نشده‌اید' };
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(session.user.role ?? '')) {
    return { ok: false as const, reason: 'دسترسی ندارید' };
  }
  return { ok: true as const, userId: session.user.id };
};

const toJob = (row: {
  id: string;
  type: string;
  queue: string;
  status: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
  triggeredBy: string | null;
  payload: unknown;
  result: unknown;
  createdAt: Date;
}): JobSummary => ({
  id: row.id,
  type: row.type,
  queue: row.queue,
  status: (['pending', 'running', 'completed', 'failed', 'dead'].includes(row.status)
    ? row.status
    : 'pending') as JobStatus,
  priority: row.priority,
  attempts: row.attempts,
  maxAttempts: row.maxAttempts,
  scheduledAt: row.scheduledAt?.toISOString() ?? null,
  startedAt: row.startedAt?.toISOString() ?? null,
  completedAt: row.completedAt?.toISOString() ?? null,
  failedAt: row.failedAt?.toISOString() ?? null,
  errorMessage: row.errorMessage,
  triggeredBy: row.triggeredBy,
  payload: row.payload,
  result: row.result,
  createdAt: row.createdAt.toISOString(),
});

const fetchSnapshotRaw = async (): Promise<JobSnapshot> => {
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [jobs, byStatus, byQueue, completed24, failed24, dead] = await Promise.all([
    prisma.backgroundJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.backgroundJob.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.backgroundJob.groupBy({
      by: ['queue'],
      where: { status: { in: ['pending', 'running', 'failed'] } },
      _count: { _all: true },
    }),
    prisma.backgroundJob.findMany({
      where: { status: 'completed', completedAt: { gte: since24 } },
      select: { startedAt: true, completedAt: true },
    }),
    prisma.backgroundJob.count({ where: { status: 'failed', failedAt: { gte: since24 } } }),
    prisma.backgroundJob.count({ where: { status: 'dead' } }),
  ]);

  const byStatusMap = new Map(byStatus.map((r) => [r.status, r._count._all]));
  const byQueueMap = new Map<string, { pending: number; running: number; failed: number }>();
  for (const q of byQueue) {
    const e = byQueueMap.get(q.queue) ?? { pending: 0, running: 0, failed: 0 };
    // simplify - count را به pending اختصاص می‌دهیم
    e.pending += q._count._all;
    byQueueMap.set(q.queue, e);
  }

  // میانگین مدت jobهای completed
  let totalDuration = 0;
  let durationCount = 0;
  for (const c of completed24) {
    if (c.startedAt && c.completedAt) {
      totalDuration += c.completedAt.getTime() - c.startedAt.getTime();
      durationCount += 1;
    }
  }
  const avgDurationMs = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

  // hourly completed in 24h
  const hourly: number[] = new Array(24).fill(0);
  for (const c of completed24) {
    if (c.completedAt) {
      const hAgo = Math.floor((Date.now() - c.completedAt.getTime()) / (60 * 60 * 1000));
      if (hAgo >= 0 && hAgo < 24) hourly[23 - hAgo] = (hourly[23 - hAgo] ?? 0) + 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    jobs: jobs.map(toJob),
    metrics: {
      pending: byStatusMap.get('pending') ?? 0,
      running: byStatusMap.get('running') ?? 0,
      completed24h: completed24.length,
      failed24h: failed24,
      dead,
      avgDurationMs,
    },
    queues: Array.from(byQueueMap.entries()).map(([name, counts]) => ({
      name,
      pending: counts.pending,
      running: counts.running,
      failed: counts.failed,
    })),
    hourly,
  };
};

const empty: JobSnapshot = {
  generatedAt: new Date().toISOString(),
  jobs: [],
  metrics: { pending: 0, running: 0, completed24h: 0, failed24h: 0, dead: 0, avgDurationMs: 0 },
  queues: [],
  hourly: new Array(24).fill(0),
};

const getCachedSnapshot = safeCache(fetchSnapshotRaw, empty, {
  key: 'jobs-snapshot',
  ttl: 15,
  tags: ['background-job', 'jobs'],
});

export async function getJobSnapshot(): Promise<{
  success: boolean;
  data?: JobSnapshot;
  message?: string;
}> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const data = await getCachedSnapshot();
    return { success: true, data };
  } catch (err) {
    return {
      success: true,
      data: empty,
      message: err instanceof Error ? err.message : 'خطای ناشناخته',
    };
  }
}

export interface EnqueueJobInput {
  type: string;
  queue?: string;
  payload?: unknown;
  priority?: number;
  scheduledAt?: Date | null;
  triggeredBy?: string;
}

export async function enqueueJob(
  input: EnqueueJobInput,
): Promise<{ success: boolean; id?: string; message?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.reason };
  if (!input.type.trim()) return { success: false, message: 'نوع job الزامی است' };

  try {
    const created = await prisma.backgroundJob.create({
      data: {
        type: input.type.trim(),
        queue: input.queue ?? 'default',
        payload: input.payload === undefined ? undefined : (input.payload as object),
        priority: input.priority ?? 0,
        scheduledAt: input.scheduledAt ?? null,
        triggeredBy: input.triggeredBy ?? guard.userId,
        status: input.scheduledAt && input.scheduledAt > new Date() ? 'pending' : 'pending',
      },
      select: { id: true },
    });
    revalidateTag('jobs');
    revalidateTag('background-job');
    return { success: true, id: created.id };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در ساخت job',
    };
  }
}

export async function cancelJob(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    await prisma.backgroundJob.update({
      where: { id },
      data: { status: 'dead', failedAt: new Date(), errorMessage: 'لغو شده توسط ادمین' },
    });
    revalidateTag('jobs');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در لغو',
    };
  }
}

export async function retryJob(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    await prisma.backgroundJob.update({
      where: { id },
      data: {
        status: 'pending',
        startedAt: null,
        completedAt: null,
        failedAt: null,
        errorMessage: null,
      },
    });
    revalidateTag('jobs');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در تلاش مجدد',
    };
  }
}
