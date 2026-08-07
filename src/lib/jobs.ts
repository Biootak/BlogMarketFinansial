/**
 * jobs.ts — مرکز داده‌های Job Center
 * ─────────────────────────────────────────────────────────────
 *  داده‌های واقعی از BackgroundJob (صف، retry، DLQ، cron)
 */

import 'server-only';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { revalidateTag } from '@/lib/revalidate';
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
  maxAttempts?: number;
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
        maxAttempts: input.maxAttempts ?? 3,
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

export async function cancelJob(id: string): Promise<{ success: boolean; message?: string }> {
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

export async function retryJob(id: string): Promise<{ success: boolean; message?: string }> {
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

/* ─────────────────────────────────────────────────────────────
 * Job Inspector (detail view) + list + queue-health aggregations
 * ───────────────────────────────────────────────────────────── */

export interface JobLifecycleEvent {
  /** stage: created | scheduled | started | completed | failed | retried | cancelled */
  stage: 'created' | 'scheduled' | 'started' | 'completed' | 'failed' | 'retried' | 'cancelled';
  at: string;
  detail?: string | null;
}

/**
 * ساخت timeline (lifecycle) از روی timestamp های خود job — ساده و سریع،
 * بدون join به جدول جداگانه. اگر job ایندکس‌های کافی داشته باشد،
 * این query فقط 1 row می‌خواند.
 */
export function buildJobLifecycle(row: {
  createdAt: Date;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  attempts: number;
  status: string;
  errorMessage: string | null;
}): JobLifecycleEvent[] {
  const events: JobLifecycleEvent[] = [];
  events.push({ stage: 'created', at: row.createdAt.toISOString() });

  if (row.scheduledAt && row.scheduledAt.getTime() > row.createdAt.getTime()) {
    events.push({
      stage: 'scheduled',
      at: row.scheduledAt.toISOString(),
      detail: 'زمان‌بندی شده برای اجرای آینده',
    });
  }
  if (row.startedAt) {
    events.push({
      stage: row.attempts > 1 ? 'retried' : 'started',
      at: row.startedAt.toISOString(),
      detail: row.attempts > 1 ? `تلاش ${row.attempts}` : 'پردازش آغاز شد',
    });
  }
  if (row.completedAt) {
    events.push({
      stage: 'completed',
      at: row.completedAt.toISOString(),
      detail: row.startedAt
        ? `در ${Math.max(0, row.completedAt.getTime() - row.startedAt.getTime())} ms`
        : null,
    });
  }
  if (row.failedAt) {
    events.push({
      stage: 'failed',
      at: row.failedAt.toISOString(),
      detail: row.errorMessage ?? null,
    });
  }
  if (row.status === 'dead') {
    events.push({
      stage: 'cancelled',
      at: row.failedAt?.toISOString() ?? row.createdAt.toISOString(),
      detail: 'به صف مرده منتقل شد',
    });
  }
  return events;
}

export interface JobDetail extends JobSummary {
  /** stack trace اگر job با خطا failed شده باشد */
  errorStack: string | null;
  /** نتیجه‌ی job پس از تکمیل */
  result: unknown;
  /** تایم‌لاین ساخته‌شده از timestamp های job */
  lifecycle: JobLifecycleEvent[];
}

export async function getJobById(
  id: string,
): Promise<{ success: boolean; data?: JobDetail; message?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.reason };
  if (!id || typeof id !== 'string') {
    return { success: false, message: 'شناسه job نامعتبر است' };
  }
  try {
    const row = await prisma.backgroundJob.findUnique({ where: { id } });
    if (!row) return { success: false, message: 'job یافت نشد' };
    const summary = toJob(row);
    return {
      success: true,
      data: {
        ...summary,
        errorStack: row.errorStack ?? null,
        result: row.result ?? null,
        lifecycle: buildJobLifecycle(row),
      },
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطای ناشناخته',
    };
  }
}

export interface QueueHealth {
  name: string;
  pending: number;
  running: number;
  completed24h: number;
  failed24h: number;
  dead: number;
  total: number;
  /** درصد خطا نسبت به کل عملیات ۲� ساعت اخیر */
  failureRate: number;
  /** health score 0..100 — هرچه بالاتر، سالم‌تر */
  score: number;
  /** وضعیت سلامت صف برای badge */
  status: 'healthy' | 'degraded' | 'critical' | 'idle';
}

const fetchQueueHealthRaw = async (): Promise<QueueHealth[]> => {
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [byQueue, byStatusLast24, allQueues] = await Promise.all([
    prisma.backgroundJob.groupBy({
      by: ['queue'],
      where: { status: { in: ['pending', 'running', 'failed'] } },
      _count: { _all: true },
    }),
    prisma.backgroundJob.groupBy({
      by: ['queue', 'status'],
      where: {
        OR: [{ completedAt: { gte: since24 } }, { failedAt: { gte: since24 } }],
      },
      _count: { _all: true },
    }),
    prisma.backgroundJob.groupBy({
      by: ['queue'],
      _count: { _all: true },
    }),
  ]);

  // تجمیع: pending/running/failed24h/dead/completed24h per queue
  const map = new Map<string, QueueHealth>();

  for (const q of allQueues) {
    const existing = map.get(q.queue) ?? {
      name: q.queue,
      pending: 0,
      running: 0,
      completed24h: 0,
      failed24h: 0,
      dead: 0,
      total: 0,
      failureRate: 0,
      score: 0,
      status: 'idle' as const,
    };
    existing.total = q._count._all;
    map.set(q.queue, existing);
  }

  for (const r of byQueue) {
    const entry = map.get(r.queue) ?? {
      name: r.queue,
      pending: 0,
      running: 0,
      completed24h: 0,
      failed24h: 0,
      dead: 0,
      total: 0,
      failureRate: 0,
      score: 0,
      status: 'idle' as const,
    };
    entry.pending += r._count._all;
    map.set(r.queue, entry);
  }

  for (const r of byStatusLast24) {
    const entry = map.get(r.queue);
    if (!entry) continue;
    if (r.status === 'completed') entry.completed24h += r._count._all;
    if (r.status === 'failed') entry.failed24h += r._count._all;
  }

  // dead count + health score
  const deadByQueue = await prisma.backgroundJob.groupBy({
    by: ['queue'],
    where: { status: 'dead' },
    _count: { _all: true },
  });
  for (const r of deadByQueue) {
    const entry = map.get(r.queue);
    if (entry) entry.dead = r._count._all;
  }

  // محاسبه score و status
  for (const entry of map.values()) {
    const total24 = entry.completed24h + entry.failed24h;
    entry.failureRate = total24 > 0 ? (entry.failed24h / total24) * 100 : 0;
    // هرچه failureRate کمتر و total بیشتر → سالم‌تر
    if (entry.total === 0 && total24 === 0) {
      entry.score = 100;
      entry.status = 'idle';
    } else if (entry.failureRate >= 30 || entry.dead >= 5) {
      entry.score = Math.max(0, 60 - entry.failureRate);
      entry.status = 'critical';
    } else if (entry.failureRate >= 10 || entry.dead >= 1) {
      entry.score = Math.max(40, 80 - entry.failureRate);
      entry.status = 'degraded';
    } else {
      entry.score = Math.max(60, 100 - entry.failureRate);
      entry.status = 'healthy';
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
};

const getCachedQueueHealth = safeCache(fetchQueueHealthRaw, [], {
  key: 'jobs-queue-health',
  ttl: 15,
  tags: ['background-job', 'jobs'],
});

export async function getQueueHealth(): Promise<{
  success: boolean;
  data: QueueHealth[];
  message?: string;
}> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, data: [], message: guard.reason };
  try {
    const data = await getCachedQueueHealth();
    return { success: true, data };
  } catch {
    return { success: true, data: [], message: 'خطا در محاسبه سلامت صف' };
  }
}

/** نوع‌های job که در ۲۴ ساعت اخیر دیده شده‌اند (برای فیلتر و autocomplete) */
export interface JobTypeInfo {
  type: string;
  count: number;
  lastSeen: string;
  lastStatus: 'completed' | 'failed' | 'running' | 'pending' | 'dead';
}

const fetchRecentJobTypesRaw = async (): Promise<JobTypeInfo[]> => {
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await prisma.backgroundJob.findMany({
    where: { createdAt: { gte: since24 } },
    orderBy: { createdAt: 'desc' },
    take: 100, // Reduce from 500 to 100 for faster stats
    select: { type: true, status: true, createdAt: true },
  });
  const map = new Map<string, JobTypeInfo>();
  for (const r of rows) {
    const existing = map.get(r.type);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(r.type, {
        type: r.type,
        count: 1,
        lastSeen: r.createdAt.toISOString(),
        lastStatus: (['completed', 'failed', 'running', 'pending', 'dead'].includes(r.status)
          ? r.status
          : 'pending') as JobTypeInfo['lastStatus'],
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
};

const getCachedJobTypes = safeCache(fetchRecentJobTypesRaw, [], {
  key: 'jobs-types',
  ttl: 30,
  tags: ['background-job', 'jobs'],
});

export async function getRecentJobTypes(): Promise<{
  success: boolean;
  data: JobTypeInfo[];
  message?: string;
}> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, data: [], message: guard.reason };
  try {
    const data = await getCachedJobTypes();
    return { success: true, data };
  } catch {
    return { success: true, data: [], message: 'خطا در فهرست نوع‌ها' };
  }
}
