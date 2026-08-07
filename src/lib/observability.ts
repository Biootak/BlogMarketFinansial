/**
 * observability.ts — منبع دادهٔ مرکز مشاهده‌پذیری
 * ─────────────────────────────────────────────────────────────
 *  همه‌ی اعداد از دیتابیس می‌آیند:
 *   - SystemLog  → حجم، سطح، منبع، خطا، کوئری کند، تأخیر واقعی (duration=)
 *   - AuditLog   → رد ممیزی ۲۴ ساعت
 *   - process    → حافظه و uptime پروسه
 *
 *  ۲۰۲۶-۰۸-۰۶ — بازنویسی: یک اسکن با سقف مشخص به‌جای سه full scan.
 *
 *  ۲۰۲۶-۰۸-۰۷ — رفع سه باگ بحرانی که داشبورد را روی دادهٔ واقعی بی‌اثر
 *  کرده بود:
 *
 *   1. **واژگان سطح لاگ.** فقط `'error' | 'fatal'` (lowercase) شمرده می‌شد،
 *      در حالی که نویسندگان لاگ `'ERROR'` و `'WARNING'` می‌نوشتند. یعنی روی
 *      دیتابیسِ پر از خطا، دفتر خطا و نرخ خطا و پنجره‌های بحرانی و توزیع
 *      سطوح همگی صفر بودند. حالا واژگان از `@/lib/log-levels` می‌آید و کوئری
 *      تاریخی همهٔ املاها را می‌گیرد.
 *
 *   2. **نگاشت منبع به سرویس.** `SERVICE_DEFS` با کلید خام به `perSource`
 *      مچ می‌شد، ولی منابع واقعی `api/auth`, `cron/rates`, `middleware` بودند؛
 *      نتیجه اینکه ۸ سرویس از ۹ همیشه `idle` می‌ماندند. حالا
 *      `resolveServiceKey` این فاصله را پر می‌کند.
 *
 *   3. **صداقت در خطا.** هنگام سقوط دیتابیس `success: true` با snapshot خالی
 *      برمی‌گشت — یعنی دقیقاً لحظه‌ای که سامانه down بود، صفحهٔ مانیتورینگ
 *      همه‌چیز را «سبز و صفر» نشان می‌داد. بدترین حالت ممکن برای یک ابزار
 *      observability. حالا `degraded: true` علامت می‌خورد.
 *
 *  دو دروغ کوچک‌تر هم برداشته شد:
 *   - `latencyMs` از عدد ثابت `def.base` ساخته می‌شد. حالا از نمونه‌های واقعی
 *     `duration=` همان سرویس می‌آید و اگر نمونه نداشته باشیم
 *     `latencyMeasured=false` است تا UI «—» نشان دهد نه یک عدد ساختگی.
 *   - `estimateUptime` کف مصنوعی ۹۰٪ داشت؛ یعنی سرویسِ کاملاً مرده هم هرگز
 *     زیر ۹۰٪ دیده نمی‌شد.
 */

import 'server-only';

import { auth } from '@/auth';
import type { ServiceStatus } from '@/components/Dashboard/DashboardPage/LiveOpsPulse';
import prisma from '@/lib/db';
import {
  ERROR_LEVEL_DB_VARIANTS,
  type LogLevel,
  isErrorLevel,
  isWarnLevel,
  normalizeLogLevel,
} from '@/lib/log-levels';
import { type ServiceKey, resolveServiceKey } from '@/lib/log-sources';
import { safeCache } from '@/lib/safe-cache';

export type { ServiceKey };

/** پنجرهٔ تحلیل (ساعت) */
export const OBS_WINDOW_HOURS = 24;
/** سقف ردیف‌های اسکن‌شده — از OOM روی دیتابیس شلوغ جلوگیری می‌کند */
const SCAN_LIMIT = 20_000;
/** سقف نمونه‌برداری برای صدک‌های تأخیر */
const LATENCY_SAMPLE_LIMIT = 1_000;
/** کمترین تعداد نمونه‌ای که اجازه می‌دهد عدد را «اندازه‌گیری‌شده» بنامیم */
const MIN_LATENCY_SAMPLES = 5;
const HEAT_ROWS = 8;
const SOURCE_ROWS = 10;

export interface ServiceHealth {
  id: ServiceKey;
  name: string;
  desc: string;
  status: ServiceStatus;
  /** صدک ۹۵ تأخیر واقعی (ms). وقتی `latencyMeasured` غلط است بی‌معناست. */
  latencyMs: number;
  /** true یعنی این عدد از لاگ‌های `duration=` همین سرویس آمده، نه از تخمین. */
  latencyMeasured: boolean;
  /** تعداد نمونهٔ واقعی تأخیر این سرویس */
  latencySamples: number;
  /** خطا در دقیقه (پنجرهٔ ۱۵ دقیقه) */
  errorRate: number;
  /** درصد در دسترس بودن ۲۴ ساعت — بدون کف مصنوعی */
  uptime24h: number;
  /** ۲۴ نقطه، نرمال‌شده ۰..۱۰۰ — حجم واقعی لاگ هر ساعت */
  sparkline: number[];
  /** تعداد خطای واقعی ۲۴ ساعت */
  errors24h: number;
  /** تعداد رویداد واقعی ۲۴ ساعت */
  events24h: number;
  /** منابع خامی که به این سرویس نگاشت شده‌اند — برای شفافیت و اشکال‌زدایی */
  sources: string[];
  href: string;
}

/** سطوحی که در دفتر خطا معنی دارند. `debug` عمداً اینجا نیست. */
export type Severity = 'info' | 'warn' | 'error' | 'fatal';

const asSeverity = (level: LogLevel): Severity => (level === 'debug' ? 'info' : level);

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
  /** سرویسی که این منبع به آن نسبت داده شده؛ null یعنی نشناختیم. */
  service: ServiceKey | null;
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
  level: LogLevel;
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
  /**
   * true یعنی این snapshot از دیتابیس خوانده **نشده** است.
   * هیچ‌کدام از اعداد زیر را نباید به‌عنوان واقعیت نشان داد؛ UI باید صریحاً
   * بگوید «خوانش در دسترس نیست». صفرِ دروغین بدترین خروجی یک ابزار پایش است.
   */
  degraded: boolean;
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

/**
 * درصد در دسترس بودن. کفِ مصنوعی ۹۰٪ حذف شد: سرویسی که در ۲۴ ساعت فقط خطا
 * لاگ کرده باید ۰٪ نشان دهد، نه ۹۰٪.
 */
const computeUptime = (errorCount: number, totalCount: number): number => {
  if (totalCount <= 0) return 0;
  const value = 100 - (errorCount / totalCount) * 100;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
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

/** استخراج امنِ `duration=NNN` از متن لاگ. */
const readDuration = (message: string): number | null => {
  const match = DURATION_RE.exec(message);
  if (!match) return null;
  const value = Number.parseInt(match[1] ?? '', 10);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
};

const SERVICE_DEFS: Array<{
  id: ServiceKey;
  name: string;
  desc: string;
  href: string;
}> = [
  {
    id: 'api',
    name: 'API اصلی',
    desc: 'Route Handlers و Server Actions',
    href: '/dashboard/observability/latency',
  },
  {
    id: 'db',
    name: 'پایگاه داده',
    desc: 'Postgres اصلی و replica',
    href: '/dashboard/observability/queries',
  },
  { id: 'cache', name: 'کش', desc: 'Redis و کش حافظه‌ای', href: '/dashboard/settings' },
  { id: 'queue', name: 'صف پیام', desc: 'Workerها و cron jobها', href: '/dashboard/jobs' },
  {
    id: 'auth',
    name: 'احراز هویت',
    desc: 'NextAuth v5، OAuth و 2FA',
    href: '/dashboard/users',
  },
  {
    id: 'edge',
    name: 'Edge و CDN',
    desc: 'میان‌افزار و پاسخ‌گویی لبه',
    href: '/dashboard/observability/latency',
  },
  { id: 'email', name: 'ایمیل', desc: 'SMTP و Resend', href: '/dashboard/communication' },
  { id: 'sms', name: 'پیامک', desc: 'کد یک‌بارمصرف و اعلان', href: '/dashboard/communication' },
  { id: 'storage', name: 'ذخیره‌سازی', desc: 'S3 و فایل محلی', href: '/dashboard/settings' },
];

/* ───────────────────────── snapshot ───────────────────────── */

interface SourceAgg {
  total: number;
  errors: number;
  warns: number;
  lastAt: number;
  buckets: Bucket[];
  recentErrors: number;
  recentWarns: number;
  service: ServiceKey | null;
}

interface ServiceAgg {
  total: number;
  errors: number;
  warns: number;
  recentErrors: number;
  recentWarns: number;
  buckets: Bucket[];
  sources: Set<string>;
  latencies: number[];
}

const newSourceAgg = (at: number, service: ServiceKey | null): SourceAgg => ({
  total: 0,
  errors: 0,
  warns: 0,
  lastAt: at,
  buckets: emptyBuckets(),
  recentErrors: 0,
  recentWarns: 0,
  service,
});

const newServiceAgg = (): ServiceAgg => ({
  total: 0,
  errors: 0,
  warns: 0,
  recentErrors: 0,
  recentWarns: 0,
  buckets: emptyBuckets(),
  sources: new Set<string>(),
  latencies: [],
});

const buildSnapshot = async (now: number): Promise<ObservabilitySnapshot> => {
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
      // ⬅ باگ اصلی اینجا بود: قبلاً فقط ['error','fatal'] بود و ردیف‌های
      //    'ERROR' که seed و اکثر نویسندگان می‌نوشتند هرگز خوانده نمی‌شدند.
      where: {
        timestamp: { gte: since24 },
        level: { in: [...ERROR_LEVEL_DB_VARIANTS] },
      },
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
      // ⬅ `source` اضافه شد تا تأخیر را بتوانیم به سرویس نسبت دهیم؛
      //    قبلاً فقط یک عدد سراسری داشتیم و ردیف هر سرویس عدد ثابت می‌گرفت.
      select: { source: true, message: true },
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
  const levelMap = new Map<LogLevel, number>();
  const perSource = new Map<string, SourceAgg>();
  const perService = new Map<ServiceKey, ServiceAgg>();
  /** منابعِ دخیل در خطا، به تفکیک سطل — برای ساخت incident بدون حلقهٔ تودرتو. */
  const bucketErrorSources: Array<Set<string>> = Array.from(
    { length: OBS_WINDOW_HOURS },
    () => new Set<string>(),
  );

  let totalErrors = 0;
  let totalWarns = 0;
  let logs1h = 0;
  let errors1h = 0;

  for (const row of logs) {
    const at = row.timestamp.getTime();
    const key = row.source || 'system';
    const level = normalizeLogLevel(row.level);
    const err = isErrorLevel(level);
    const warn = isWarnLevel(level);
    const serviceKey = resolveServiceKey(key);

    levelMap.set(level, (levelMap.get(level) ?? 0) + 1);
    if (err) totalErrors += 1;
    if (warn) totalWarns += 1;
    if (at >= now - 3_600_000) {
      logs1h += 1;
      if (err) errors1h += 1;
    }

    let entry = perSource.get(key);
    if (!entry) {
      entry = newSourceAgg(at, serviceKey);
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

    let service: ServiceAgg | undefined;
    if (serviceKey !== null) {
      service = perService.get(serviceKey);
      if (!service) {
        service = newServiceAgg();
        perService.set(serviceKey, service);
      }
      service.total += 1;
      service.sources.add(key);
      if (err) service.errors += 1;
      if (warn) service.warns += 1;
      if (at >= since15m) {
        if (err) service.recentErrors += 1;
        if (warn) service.recentWarns += 1;
      }
    }

    const index = bucketIndex(now, at);
    if (index >= 0) {
      const cell = entry.buckets[index];
      if (cell) {
        cell.total += 1;
        if (err) cell.errors += 1;
        if (warn) cell.warns += 1;
      }
      const serviceCell = service?.buckets[index];
      if (serviceCell) {
        serviceCell.total += 1;
        if (err) serviceCell.errors += 1;
        if (warn) serviceCell.warns += 1;
      }
      const global = overall[index];
      if (global) {
        global.total += 1;
        if (err) global.errors += 1;
        if (warn) global.warns += 1;
      }
      if (err) bucketErrorSources[index]?.add(key);
    }
  }

  const hourly = overall.map((b) => b.total);
  const hourlyErrors = overall.map((b) => b.errors);
  const totalLogs = logs.length;

  /* ── نمونه‌های تأخیر: سراسری و به تفکیک سرویس ───────────── */
  const samples: number[] = [];
  for (const row of latencyRows) {
    const value = readDuration(row.message);
    if (value === null) continue;
    samples.push(value);
    const serviceKey = resolveServiceKey(row.source);
    if (serviceKey === null) continue;
    let service = perService.get(serviceKey);
    if (!service) {
      service = newServiceAgg();
      perService.set(serviceKey, service);
    }
    service.latencies.push(value);
  }
  samples.sort((a, b) => a - b);

  /* ── سرویس‌ها ───────────────────────────────────────────── */
  const services: ServiceHealth[] = SERVICE_DEFS.map((def) => {
    const agg = perService.get(def.id);
    const events24h = agg?.total ?? 0;
    const errors24h = agg?.errors ?? 0;
    const recentErrors = agg?.recentErrors ?? 0;
    const recentWarns = agg?.recentWarns ?? 0;

    const latencies = [...(agg?.latencies ?? [])].sort((a, b) => a - b);
    const measured = latencies.length >= MIN_LATENCY_SAMPLES;

    const buckets = agg?.buckets ?? emptyBuckets();
    const maxBucket = Math.max(...buckets.map((b) => b.total), 1);

    return {
      id: def.id,
      name: def.name,
      desc: def.desc,
      // بدون رویداد یعنی «نمی‌دانیم»، نه «سالم».
      status: events24h > 0 ? classifyStatus(recentErrors, recentWarns) : 'idle',
      latencyMs: measured ? percentile(latencies, 95) : 0,
      latencyMeasured: measured,
      latencySamples: latencies.length,
      errorRate: Math.round((recentErrors / 15) * 100) / 100,
      uptime24h: computeUptime(errors24h, events24h),
      sparkline: buckets.map((b) => Math.round((b.total / maxBucket) * 100)),
      errors24h,
      events24h,
      sources: Array.from(agg?.sources ?? []).slice(0, 6),
      href: def.href,
    };
  });

  /* ── خطاها (گروه‌بندی‌شده) ──────────────────────────────── */
  const groups = new Map<string, ErrorEvent>();
  for (const row of errorRows) {
    const level = asSeverity(normalizeLogLevel(row.level));
    const source = row.source || 'system';
    const key = `${level}:${source}:${row.message.slice(0, 80)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    groups.set(key, {
      id: row.id,
      level,
      source,
      message: row.message,
      timestamp: row.timestamp.toISOString(),
      count: 1,
    });
  }
  const errors = Array.from(groups.values()).sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  );

  /* ── کوئری‌های کند ──────────────────────────────────────── */
  const slowQueries: SlowQuery[] = slowRows
    .map((row) => ({
      id: row.id,
      source: row.source || 'system',
      message: row.message,
      durationMs: readDuration(row.message) ?? 0,
      timestamp: row.timestamp.toISOString(),
    }))
    .sort((a, b) => b.durationMs - a.durationMs);

  /* ── صدک‌های سراسری تأخیر ───────────────────────────────── */
  const errorRate = logs1h > 0 ? Math.round((errors1h / logs1h) * 1000) / 10 : 0;
  const measured = samples.length >= MIN_LATENCY_SAMPLES;
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
    service: stat.service,
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
      for (const source of bucketErrorSources[i] ?? []) involved.add(source);
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
    degraded: false,
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

/**
 * snapshotی که صریحاً می‌گوید «نخواندم».
 * `generatedAt` هر بار تازه ساخته می‌شود — نسخهٔ قبلی این مقدار را یک‌بار در
 * زمان بارگذاری ماژول می‌ساخت و برای همیشه یک زمان یخ‌زده نشان می‌داد.
 */
const degradedSnapshot = (now: number = Date.now()): ObservabilitySnapshot => ({
  generatedAt: new Date(now).toISOString(),
  windowHours: OBS_WINDOW_HOURS,
  degraded: true,
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
    memoryMb: memoryMb(),
    uptimeSec: uptimeSec(),
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

const fetchSnapshotRaw = async (): Promise<ObservabilitySnapshot> => {
  const now = Date.now();
  try {
    return await buildSnapshot(now);
  } catch {
    // دیتابیس در دسترس نیست. صادقانه degraded برمی‌گردانیم تا UI بگوید
    // «خوانش نداریم» — نه اینکه صفرها را به‌جای سلامت جا بزند.
    return degradedSnapshot(now);
  }
};

const getCachedSnapshot = safeCache(fetchSnapshotRaw, degradedSnapshot(), {
  key: 'observability-snapshot',
  ttl: 30,
  tags: ['system-log', 'audit-log', 'observability'],
});

export type ObservabilityFailure = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'DEGRADED';

export interface ObservabilityResult {
  success: boolean;
  data?: ObservabilitySnapshot;
  code?: ObservabilityFailure;
  message?: string;
}

/** نقش‌هایی که اجازهٔ دیدن مرکز مشاهده‌پذیری دارند. */
const ALLOWED_ROLES = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

/**
 * دریافت داده‌های مشاهده‌پذیری — فقط نقش‌های ارشد.
 *
 * هرگز throw نمی‌کند، ولی برخلاف نسخهٔ قبل **دروغ هم نمی‌گوید**: اگر دیتابیس
 * نخوانده باشد `success: false` با کد `DEGRADED` برمی‌گرداند و همان snapshot
 * علامت‌خورده را هم پیوست می‌کند تا UI بتواند صریحاً «داده در دسترس نیست»
 * نشان دهد. تفکیک `UNAUTHENTICATED` از `FORBIDDEN` هم لازم است چون کلاینت
 * برای اولی باید polling را قطع کند و برای دومی نه.
 */
export async function getObservabilitySnapshot(): Promise<ObservabilityResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, code: 'UNAUTHENTICATED', message: 'احراز هویت نشده‌اید' };
  }
  if (!ALLOWED_ROLES.has(session.user.role ?? '')) {
    return { success: false, code: 'FORBIDDEN', message: 'دسترسی ندارید' };
  }

  let data: ObservabilitySnapshot;
  try {
    data = await getCachedSnapshot();
  } catch {
    data = degradedSnapshot();
  }

  if (data.degraded) {
    return {
      success: false,
      data,
      code: 'DEGRADED',
      message: 'خواندن لاگ‌های سامانه ممکن نشد؛ اعداد این صفحه معتبر نیستند.',
    };
  }

  return { success: true, data };
}
