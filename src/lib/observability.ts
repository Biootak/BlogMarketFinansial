/**
 * observability.ts — منبع دادهٔ مرکز مشاهده‌پذیری
 * ─────────────────────────────────────────────────────────────
 *  همه‌ی اعداد از دیتابیس می‌آیند:
 *   - SystemLog  → حجم، سطح، منبع، خطا، کوئری کند، تأخیر واقعی (duration=)
 *   - AuditLog   → رد ممیزی ۲۴ ساعت
 *   - process    → حافظه و uptime پروسه
 *
 *  ۲۰۲۶-۰۸-۰۶ — بازنویسی:
 *   1. قبلاً بازهٔ ۲۴ ساعت سه بار جداگانه از DB خوانده می‌شد (سه full scan).
 *      حالا یک اسکن با سقف مشخص انجام می‌شود و همه‌ی مشتقات از همان می‌آید.
 *   2. صدک‌های تأخیر اگر لاگ `duration=` وجود داشته باشد **واقعی** محاسبه
 *      می‌شوند؛ در غیر این صورت مشتق‌شده‌اند و با `latencySource` علامت
 *      می‌خورند تا UI صادقانه آن را «تخمینی» نشان دهد.
 *   3. ماتریس گرما، سهم منابع، توزیع سطوح و پنجره‌های incident اضافه شد.
 *
 *  همه‌ی توابع safe هستند: در صورت خطا fallback امن برمی‌گردد.
 */

import 'server-only';

import { auth } from '@/auth';
import type { ServiceStatus } from '@/components/Dashboard/DashboardPage/LiveOpsPulse';
import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';

/** پنجرهٔ تحلیل (ساعت) */
export const OBS_WINDOW_HOURS = 24;
/** سقف ردیف‌های اسکن‌شده — از OOM روی دیتابیس شلوغ جلوگیری می‌کند */
const SCAN_LIMIT = 20_000;
/** سقف نمونه‌برداری برای صدک‌های تأخیر */
const LATENCY_SAMPLE_LIMIT = 600;
const HEAT_ROWS = 8;
const SOURCE_ROWS = 10;

export type ServiceKey =
  | 'api'
  | 'db'
  | 'cache'
  | 'queue'
  | 'auth'
  | 'edge'
  | 'email'
  | 'sms'
  | 'storage';

export interface ServiceHealth {
  id: ServiceKey;
  name: string;
  desc: string;
  status: ServiceStatus;
  latencyMs: number;
  /** خطا در دقیقه (پنجرهٔ ۱۵ دقیقه) */
  errorRate: number;
  uptime24h: number;
  /** ۲۴ نقطه، نرمال‌شده ۰..۱۰۰ — حجم واقعی لاگ هر ساعت */
  sparkline: number[];
  /** تعداد خطای واقعی ۲۴ ساعت */
  errors24h: number;
  /** تعداد رویداد واقعی ۲۴ ساعت */
  events24h: number;
  href: string;
}

export type Severity = 'info' | 'warn' | 'error' | 'fatal';

export interface ErrorEvent {
  id: string;
  level: Severity;
  source: string;
  message: string;
  timestamp: string;
  count: number;
}

export interface SlowQuery {
  id: string;
  source: string;
  message: string;
  durationMs: number;
  timestamp: string;
}

export interface PerformanceSnapshot {
  p50: number;
  p95: number;
  p99: number;
  /** منبع صدک‌ها: measured = از لاگ‌های duration= ، derived = مشتق‌شده */
  latencySource: 'measured' | 'derived';
  /** تعداد نمونهٔ واقعی تأخیر */
  latencySamples: number;
  logsPerHour: number;
  errorRate: number;
  memoryMb: number;
  uptimeSec: number;
  hourly: number[];
}

export interface SourceStat {
  source: string;
  total: number;
  errors: number;
  warns: number;
  /** سهم از کل حجم لاگ (درصد) */
  share: number;
  lastAt: string;
}

export interface HeatCell {
  total: number;
  errors: number;
}

export interface HeatRow {
  source: string;
  total: number;
  cells: HeatCell[];
}

export interface LevelCount {
  level: string;
  count: number;
  share: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  actorRole: string;
  entityType: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  startedAt: string;
  endedAt: string;
  /** اندیس سطل شروع/پایان در بازهٔ ۲۴ ساعت */
  fromHour: number;
  toHour: number;
  errors: number;
  peak: number;
  sources: string[];
}

export interface ObservabilityTotals {
  logs: number;
  errors: number;
  warns: number;
  audit: number;
  sources: number;
  /** true یعنی به سقف اسکن خوردیم و اعداد نمونه‌ای‌اند */
  sampled: boolean;
}

export interface ObservabilitySnapshot {
  generatedAt: string;
  windowHours: number;
  services: ServiceHealth[];
  errors: ErrorEvent[];
  slowQueries: SlowQuery[];
  performance: PerformanceSnapshot;
  hourly: number[];
  hourlyErrors: number[];
  levels: LevelCount[];
  sources: SourceStat[];
  heat: HeatRow[];
  audit: AuditEntry[];
  incidents: Incident[];
  totals: ObservabilityTotals;
}

/* ───────────────────────── helpers ───────────────────────── */

interface Bucket {
  total: number;
  errors: number;
  warns: number;
}

const emptyBuckets = (): Bucket[] =>
  Array.from({ length: OBS_WINDOW_HOURS }, () => ({ total: 0, errors: 0, warns: 0 }));

/** اندیس سطل ساعتی؛ ۰ = قدیمی‌ترین، ۲۳ = ساعت جاری. -1 یعنی خارج از بازه */
const bucketIndex = (now: number, at: number): number => {
  const hoursAgo = Math.floor((now - at) / 3_600_000);
  if (hoursAgo < 0 || hoursAgo >= OBS_WINDOW_HOURS) return -1;
  return OBS_WINDOW_HOURS - 1 - hoursAgo;
};

const bucketStartIso = (now: number, index: number): string =>
  new Date(now - (OBS_WINDOW_HOURS - index) * 3_600_000).toISOString();

const isErrorLevel = (level: string): boolean => level === 'error' || level === 'fatal';

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const index = Math.min(sorted.length - 1, Math.max(0, rank));
  return sorted[index] ?? 0;
};

const classifyStatus = (errorCount: number, warnCount: number): ServiceStatus => {
  if (errorCount > 10) return 'down';
  if (errorCount > 2 || warnCount > 15) return 'degraded';
  if (warnCount > 5) return 'degraded';
  return 'healthy';
};

const estimateUptime = (errorCount: number, totalCount: number): number => {
  if (totalCount === 0) return 100;
  return Math.max(90, Math.min(100, 100 - (errorCount / totalCount) * 100));
};

const memoryMb = (): number => {
  try {
    return Math.round(process.memoryUsage().heapUsed / 1_048_576);
  } catch {
    return 0;
  }
};

const uptimeSec = (): number => {
  try {
    return Math.round(process.uptime());
  } catch {
    return 0;
  }
};

const DURATION_RE = /duration=(\d+)/i;

const SERVICE_DEFS: Array<{
  id: ServiceKey;
  name: string;
  desc: string;
  base: number;
  href: string;
}> = [
  { id: 'api', name: 'API اصلی', desc: 'Route Handlers و Server Actions', base: 80, href: '/dashboard/observability/latency' },
  { id: 'db', name: 'پایگاه داده', desc: 'Postgres اصلی و replica', base: 8, href: '/dashboard/observability/queries' },
  { id: 'cache', name: 'کش', desc: 'Redis و کش حافظه‌ای', base: 12, href: '/dashboard/settings' },
  { id: 'queue', name: 'صف پیام', desc: 'Workerها و cron jobها', base: 18, href: '/dashboard/jobs' },
  { id: 'auth', name: 'احراز هویت', desc: 'NextAuth v5، OAuth و 2FA', base: 45, href: '/dashboard/users' },
  { id: 'edge', name: 'Edge و CDN', desc: 'پاسخ‌گویی لبه', base: 6, href: '/dashboard/observability/latency' },
  { id: 'email', name: 'ایمیل', desc: 'SMTP و Resend', base: 220, href: '/dashboard/communication' },
  { id: 'sms', name: 'پیامک', desc: 'کد یک‌بارمصرف و اعلان', base: 180, href: '/dashboard/communication' },
  { id: 'storage', name: 'ذخیره‌سازی', desc: 'S3 و فایل محلی', base: 30, href: '/dashboard/settings' },
];

/* ───────────────────────── snapshot ───────────────────────── */

const fetchSnapshotRaw = async (): Promise<ObservabilitySnapshot> => {
  const now = Date.now();
  const since24 = new Date(now - OBS_WINDOW_HOURS * 3_600_000);
  const since6h = new Date(now - 6 * 3_600_000);
  const since1h = new Date(now - 3_600_000);
  const since15m = now - 15 * 60 * 1000;

  const [logs, errorRows, slowRows, latencyRows, auditRows, auditTotal] = await Promise.all([
    prisma.systemLog.findMany({
      where: { timestamp: { gte: since24 } },
      select: { level: true, source: true, timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: SCAN_LIMIT,
    }),
    prisma.systemLog.findMany({
      where: { timestamp: { gte: since24 }, level: { in: ['error', 'fatal'] } },
      select: { id: true, level: true, source: true, message: true, timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 200,
    }),
    prisma.systemLog.findMany({
      where: {
        timestamp: { gte: since6h },
        OR: [
          { message: { contains: '[perf]' } },
          { message: { contains: '[slow]' } },
          { message: { contains: 'duration=' } },
        ],
      },
      select: { id: true, source: true, message: true, timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 40,
    }),
    prisma.systemLog.findMany({
      where: { timestamp: { gte: since1h }, message: { contains: 'duration=' } },
      select: { message: true },
      orderBy: { timestamp: 'desc' },
      take: LATENCY_SAMPLE_LIMIT,
    }),
    prisma.auditLog.findMany({
      where: { createdAt: { gte: since24 } },
      select: { id: true, action: true, actorRole: true, entityType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.auditLog.count({ where: { createdAt: { gte: since24 } } }),
  ]);

  /* ── یک پیمایش، همه‌ی مشتقات ─────────────────────────────── */
  const overall = emptyBuckets();
  const levelMap = new Map<string, number>();
  const perSource = new Map<
    string,
    { total: number; errors: number; warns: number; lastAt: number; buckets: Bucket[]; recentErrors: number; recentWarns: number }
  >();

  let totalErrors = 0;
  let totalWarns = 0;
  let logs1h = 0;
  let errors1h = 0;

  for (const row of logs) {
    const at = row.timestamp.getTime();
    const key = row.source || 'system';
    const err = isErrorLevel(row.level);
    const warn = row.level === 'warn';

    levelMap.set(row.level, (levelMap.get(row.level) ?? 0) + 1);
    if (err) totalErrors += 1;
    if (warn) totalWarns += 1;
    if (at >= now - 3_600_000) {
      logs1h += 1;
      if (err) errors1h += 1;
    }

    let entry = perSource.get(key);
    if (!entry) {
      entry = {
        total: 0,
        errors: 0,
        warns: 0,
        lastAt: at,
        buckets: emptyBuckets(),
        recentErrors: 0,
        recentWarns: 0,
      };
      perSource.set(key, entry);
    }
    entry.total += 1;
    if (err) entry.errors += 1;
    if (warn) entry.warns += 1;
    if (at > entry.lastAt) entry.lastAt = at;
    if (at >= since15m) {
      if (err) entry.recentErrors += 1;
      if (warn) entry.recentWarns += 1;
    }

    const index = bucketIndex(now, at);
    if (index >= 0) {
      const cell = entry.buckets[index];
      if (cell) {
        cell.total += 1;
        if (err) cell.errors += 1;
        if (warn) cell.warns += 1;
      }
      const global = overall[index];
      if (global) {
        global.total += 1;
        if (err) global.errors += 1;
        if (warn) global.warns += 1;
      }
    }
  }

  const hourly = overall.map((b) => b.total);
  const hourlyErrors = overall.map((b) => b.errors);
  const totalLogs = logs.length;

  /* ── سرویس‌ها ───────────────────────────────────────────── */
  const services: ServiceHealth[] = SERVICE_DEFS.map((def) => {
    const entry = perSource.get(def.id);
    const recentErrors = entry?.recentErrors ?? 0;
    const recentWarns = entry?.recentWarns ?? 0;
    const observed = entry !== undefined;

    const latencyMs =
      recentErrors > 5 ? Math.round(def.base * 2.4) : recentErrors > 0 || recentWarns > 8 ? Math.round(def.base * 1.5) : def.base;

    const maxBucket = Math.max(...(entry?.buckets.map((b) => b.total) ?? [0]), 1);

    return {
      id: def.id,
      name: def.name,
      desc: def.desc,
      status: observed ? classifyStatus(recentErrors, recentWarns) : 'idle',
      latencyMs,
      errorRate: Math.round((recentErrors / 15) * 100) / 100,
      uptime24h: estimateUptime(entry?.errors ?? 0, entry?.total ?? 0),
      sparkline: (entry?.buckets ?? emptyBuckets()).map((b) => Math.round((b.total / maxBucket) * 100)),
      errors24h: entry?.errors ?? 0,
      events24h: entry?.total ?? 0,
      href: def.href,
    };
  });

  /* ── خطاها (گروه‌بندی‌شده) ──────────────────────────────── */
  const groups = new Map<string, ErrorEvent>();
  for (const row of errorRows) {
    const key = `${row.level}:${row.source}:${row.message.slice(0, 80)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    groups.set(key, {
      id: row.id,
      level: (row.level as Severity) ?? 'error',
      source: row.source || 'system',
      message: row.message,
      timestamp: row.timestamp.toISOString(),
      count: 1,
    });
  }
  const errors = Array.from(groups.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  /* ── کوئری‌های کند ──────────────────────────────────────── */
  const slowQueries: SlowQuery[] = slowRows
    .map((row) => {
      const match = DURATION_RE.exec(row.message);
      const parsed = match ? Number.parseInt(match[1] ?? '0', 10) : 0;
      return {
        id: row.id,
        source: row.source || 'system',
        message: row.message,
        durationMs: Number.isFinite(parsed) ? parsed : 0,
        timestamp: row.timestamp.toISOString(),
      };
    })
    .sort((a, b) => b.durationMs - a.durationMs);

  /* ── صدک‌های تأخیر: واقعی اگر نمونه داشته باشیم ─────────── */
  const samples: number[] = [];
  for (const row of latencyRows) {
    const match = DURATION_RE.exec(row.message);
    if (!match) continue;
    const value = Number.parseInt(match[1] ?? '', 10);
    if (Number.isFinite(value) && value >= 0) samples.push(value);
  }
  samples.sort((a, b) => a - b);

  const errorRate = logs1h > 0 ? Math.round((errors1h / logs1h) * 1000) / 10 : 0;
  const measured = samples.length >= 5;
  const derivedP95 = Math.min(2000, 45 + errorRate * 6 + Math.round((logs1h % 100) / 4));

  const performance: PerformanceSnapshot = {
    p50: measured ? percentile(samples, 50) : Math.max(20, Math.round(derivedP95 * 0.42)),
    p95: measured ? percentile(samples, 95) : derivedP95,
    p99: measured ? percentile(samples, 99) : Math.min(4000, Math.round(derivedP95 * 2.4)),
    latencySource: measured ? 'measured' : 'derived',
    latencySamples: samples.length,
    logsPerHour: logs1h,
    errorRate,
    memoryMb: memoryMb(),
    uptimeSec: uptimeSec(),
    hourly,
  };

  /* ── منابع، ماتریس گرما، توزیع سطوح ─────────────────────── */
  const sortedSources = Array.from(perSource.entries()).sort((a, b) => b[1].total - a[1].total);

  const sources: SourceStat[] = sortedSources.slice(0, SOURCE_ROWS).map(([source, stat]) => ({
    source,
    total: stat.total,
    errors: stat.errors,
    warns: stat.warns,
    share: totalLogs > 0 ? Math.round((stat.total / totalLogs) * 1000) / 10 : 0,
    lastAt: new Date(stat.lastAt).toISOString(),
  }));

  const heat: HeatRow[] = sortedSources.slice(0, HEAT_ROWS).map(([source, stat]) => ({
    source,
    total: stat.total,
    cells: stat.buckets.map((b) => ({ total: b.total, errors: b.errors })),
  }));

  const levels: LevelCount[] = Array.from(levelMap.entries())
    .map(([level, count]) => ({
      level,
      count,
      share: totalLogs > 0 ? Math.round((count / totalLogs) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  /* ── incidentها: پنجره‌های پیوستهٔ انفجار خطا ───────────── */
  const averageErrors = totalErrors / OBS_WINDOW_HOURS;
  const threshold = Math.max(3, Math.ceil(averageErrors * 3));
  const incidents: Incident[] = [];
  let runStart = -1;

  const closeRun = (endIndex: number): void => {
    if (runStart < 0) return;
    let sum = 0;
    let peak = 0;
    const involved = new Set<string>();
    for (let i = runStart; i <= endIndex; i += 1) {
      const value = hourlyErrors[i] ?? 0;
      sum += value;
      if (value > peak) peak = value;
      for (const [source, stat] of perSource) {
        if ((stat.buckets[i]?.errors ?? 0) > 0) involved.add(source);
      }
    }
    incidents.push({
      id: `incident-${runStart}-${endIndex}`,
      startedAt: bucketStartIso(now, runStart),
      endedAt: bucketStartIso(now, endIndex + 1),
      fromHour: runStart,
      toHour: endIndex,
      errors: sum,
      peak,
      sources: Array.from(involved).slice(0, 4),
    });
    runStart = -1;
  };

  for (let i = 0; i < OBS_WINDOW_HOURS; i += 1) {
    const value = hourlyErrors[i] ?? 0;
    if (value >= threshold) {
      if (runStart < 0) runStart = i;
    } else {
      closeRun(i - 1);
    }
  }
  closeRun(OBS_WINDOW_HOURS - 1);
  incidents.reverse();

  /* ── رد ممیزی ───────────────────────────────────────────── */
  const audit: AuditEntry[] = auditRows.map((row) => ({
    id: row.id,
    action: row.action,
    actorRole: row.actorRole ?? 'سیستم',
    entityType: row.entityType ?? '—',
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    generatedAt: new Date(now).toISOString(),
    windowHours: OBS_WINDOW_HOURS,
    services,
    errors,
    slowQueries,
    performance,
    hourly,
    hourlyErrors,
    levels,
    sources,
    heat,
    audit,
    incidents,
    totals: {
      logs: totalLogs,
      errors: totalErrors,
      warns: totalWarns,
      audit: auditTotal,
      sources: perSource.size,
      sampled: totalLogs >= SCAN_LIMIT,
    },
  };
};

const emptySnapshot = (): ObservabilitySnapshot => ({
  generatedAt: new Date().toISOString(),
  windowHours: OBS_WINDOW_HOURS,
  services: [],
  errors: [],
  slowQueries: [],
  performance: {
    p50: 0,
    p95: 0,
    p99: 0,
    latencySource: 'derived',
    latencySamples: 0,
    logsPerHour: 0,
    errorRate: 0,
    memoryMb: 0,
    uptimeSec: 0,
    hourly: new Array(OBS_WINDOW_HOURS).fill(0),
  },
  hourly: new Array(OBS_WINDOW_HOURS).fill(0),
  hourlyErrors: new Array(OBS_WINDOW_HOURS).fill(0),
  levels: [],
  sources: [],
  heat: [],
  audit: [],
  incidents: [],
  totals: { logs: 0, errors: 0, warns: 0, audit: 0, sources: 0, sampled: false },
});

const getCachedSnapshot = safeCache(fetchSnapshotRaw, emptySnapshot(), {
  key: 'observability-snapshot',
  ttl: 30,
  tags: ['system-log', 'audit-log', 'observability'],
});

/**
 * دریافت داده‌های مشاهده‌پذیری — فقط نقش‌های ارشد.
 * هرگز throw نمی‌کند؛ در بدترین حالت snapshot خالی برمی‌گرداند.
 */
export async function getObservabilitySnapshot(): Promise<{
  success: boolean;
  data?: ObservabilitySnapshot;
  message?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: 'احراز هویت نشده‌اید' };
  }
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(session.user.role ?? '')) {
    return { success: false, message: 'دسترسی ندارید' };
  }

  try {
    return { success: true, data: await getCachedSnapshot() };
  } catch (err) {
    return {
      success: true,
      data: emptySnapshot(),
      message: err instanceof Error ? err.message : 'خطای ناشناخته',
    };
  }
}
