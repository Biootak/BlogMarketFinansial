'use client';

/**
 * QueuesView — Mission Control برای صف‌های Job
 * ─────────────────────────────────────────────────────────────
 *  فلسفه: ۴ zone بصری اصلی
 *    1. COMMAND HERO (dark) — title + ۴ mini stat + Queue Constellation
 *    2. PULSE GRID (light) — ۴ vital card + Throughput River
 *    3. QUEUE FIELD (signature, light) — Queue Profile Cards با health ring
 *    4. JOB STREAM — جدول زنده jobها به تفکیک صف
 *
 *  تنظیمات:
 *   - ۳ tone: indigo (dominant) + emerald (success) + rose (danger)
 *   - ۱ overlay: ambient grid در HERO فقط
 *   - ۲ motion: pulse + flow (global clamp در tokens.css)
 *   - ۱ SVG signature: Queue Constellation در HERO
 *   - بدون hex، بدون emoji، فقط oklch + tokens
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Cpu,
  Filter,
  Hash,
  ListTree,
  RefreshCw,
  Search,
  Trash2,
  Zap,
} from 'lucide-react';
import { toPersianDigits } from '@/lib/setup/format';
import { HubHeader, LiveDot } from '@/components/Dashboard/PlatformHub';
import s from './Queues.module.css';

type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead';
type QueueHealthStatus = 'healthy' | 'degraded' | 'critical' | 'idle';

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

type QueueHealth = {
  name: string;
  pending: number;
  running: number;
  completed24h: number;
  failed24h: number;
  dead: number;
  failureRate: number;
  score: number;
  status: QueueHealthStatus;
};

type JobTypeInfo = {
  type: string;
  count: number;
  lastSeen: string;
  lastStatus: JobStatus;
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
  queueHealth: QueueHealth[];
  jobTypes: JobTypeInfo[];
}

const STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'در انتظار',
  running: 'در حال اجرا',
  completed: 'تکمیل',
  failed: 'ناموفق',
  dead: 'مرده',
};

const HEALTH_LABEL: Record<QueueHealthStatus, string> = {
  healthy: 'سالم',
  degraded: 'نیاز به توجه',
  critical: 'بحرانی',
  idle: 'بیکار',
};

const HEALTH_VAR: Record<QueueHealthStatus, string> = {
  healthy: 'var(--ds-accent-emerald)',
  degraded: 'var(--ds-accent-amber)',
  critical: 'var(--ds-accent-rose)',
  idle: 'var(--ds-accent-indigo)',
};

function fmtPersian(n: number): string {
  return toPersianDigits(n.toLocaleString('en-US'));
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = Date.now() - d;
  if (diff < 60_000) return 'لحظاتی پیش';
  if (diff < 3_600_000) return `${toPersianDigits(Math.floor(diff / 60_000))} دقیقه پیش`;
  if (diff < 86_400_000) return `${toPersianDigits(Math.floor(diff / 3_600_000))} ساعت پیش`;
  return `${toPersianDigits(Math.floor(diff / 86_400_000))} روز پیش`;
}

export function QueuesView({
  jobs,
  queues,
  hourly,
  metrics,
  queueHealth,
  jobTypes,
}: QueuesViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [queueFilter, setQueueFilter] = useState<string>('all');

  // ── derived: total weight & peak hour
  const peakHour = useMemo(() => {
    let m = 0;
    let p = 0;
    hourly.forEach((v, i) => {
      if (v > m) {
        m = v;
        p = i;
      }
    });
    return { value: m, hour: 23 - p };
  }, [hourly]);

  // ── derived: jobs by queue (full filter)
  const grouped: Record<string, Job[]> = useMemo(() => {
    const g: Record<string, Job[]> = {};
    for (const j of jobs) {
      (g[j.queue] ??= []).push(j);
    }
    return g;
  }, [jobs]);

  // ── derived: jobs for the live stream
  const streamJobs = useMemo(() => {
    let list = jobs;
    if (statusFilter !== 'all') list = list.filter((j) => j.status === statusFilter);
    if (queueFilter !== 'all') list = list.filter((j) => j.queue === queueFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (j) => j.type.toLowerCase().includes(q) || j.queue.toLowerCase().includes(q) || j.id.toLowerCase().includes(q),
      );
    }
    return list.slice(0, 50);
  }, [jobs, search, statusFilter, queueFilter]);

  // ── derived: types by queue (for Queue Profile Card)
  const typesByQueue = useMemo(() => {
    const map = new Map<string, JobTypeInfo[]>();
    for (const t of jobTypes) {
      // Job type may not directly map to queue — show all recent types in first queue
      // (در عمل JobType از snapshot آمده — در این صفحه به صورت global استفاده می‌شود)
    }
    // ساخت map از روی job ها (دقیق‌تر)
    const types = new Map<string, Map<string, number>>();
    for (const j of jobs) {
      const m = types.get(j.queue) ?? new Map<string, number>();
      m.set(j.type, (m.get(j.type) ?? 0) + 1);
      types.set(j.queue, m);
    }
    for (const [q, m] of types) {
      const arr = Array.from(m.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      map.set(q, arr as unknown as JobTypeInfo[]);
    }
    return map;
  }, [jobs, jobTypes]);

  // ── derived: queueConstellation segments
  const constellationSegments = useMemo(() => {
    if (queueHealth.length === 0) {
      return [];
    }
    const total = Math.max(
      queueHealth.reduce((acc, q) => acc + q.pending + q.running + q.dead, 0),
      1,
    );
    return queueHealth.map((q) => ({
      id: q.name,
      label: q.name,
      value: q.pending + q.running + q.dead,
      share: ((q.pending + q.running + q.dead) / total) * 100,
      tone: q.status,
    }));
  }, [queueHealth]);

  const overallHealth: QueueHealthStatus = useMemo(() => {
    if (queueHealth.length === 0) return 'idle';
    if (queueHealth.some((q) => q.status === 'critical')) return 'critical';
    if (queueHealth.some((q) => q.status === 'degraded')) return 'degraded';
    return 'healthy';
  }, [queueHealth]);

  const overallHealthLabel: Record<QueueHealthStatus, string> = {
    healthy: 'همه صف‌ها سالم',
    degraded: 'برخی صف‌ها نیاز به توجه',
    critical: 'وضعیت بحرانی',
    idle: 'بیکار',
  };

  // ── render: Constellation SVG (signature)
  const renderConstellation = () => {
    const size = 320;
    const cx = size / 2;
    const cy = size / 2;
    const orbitR = 110;
    if (constellationSegments.length === 0) return null;

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className={s.constellationSvg} aria-hidden="true">
        <defs>
          <linearGradient id="q-constellation-core" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="q-constellation-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* outer ring */}
        <circle cx={cx} cy={cy} r={orbitR} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={orbitR - 24} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 6" />

        {/* center halo */}
        <circle cx={cx} cy={cy} r={50} fill="url(#q-constellation-center)" />
        <circle cx={cx} cy={cy} r={20} fill="currentColor" fillOpacity="0.10" />

        {/* nodes */}
        {constellationSegments.slice(0, 8).map((seg, i) => {
          const total = constellationSegments.length;
          const angle = (i / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * orbitR;
          const y = cy + Math.sin(angle) * orbitR;
          const radius = 6 + Math.min(seg.share / 4, 12);
          const tone = HEALTH_VAR[seg.tone];
          return (
            <g key={seg.id}>
              {/* connection line */}
              <line
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="1"
              />
              {/* glow */}
              <circle cx={x} cy={y} r={radius + 6} fill={tone} fillOpacity="0.18" />
              {/* node */}
              <circle cx={x} cy={y} r={radius} fill={tone} fillOpacity="0.85" />
              <circle cx={x} cy={y} r={radius} fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="0.75" />
            </g>
          );
        })}

        {/* center label */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize="28"
          fontWeight="800"
          fill="currentColor"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {fmtPersian(queueHealth.length)}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill="currentColor"
          fillOpacity="0.7"
          letterSpacing="0.1em"
        >
          صف فعال
        </text>
      </svg>
    );
  };

  // ── render: queue health ring
  const renderHealthRing = (q: QueueHealth, size = 64) => {
    const r = (size - 8) / 2;
    const c = size / 2;
    const dash = 2 * Math.PI * r;
    const offset = dash * (1 - q.score / 100);
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeOpacity="0.10" strokeWidth="3" />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={HEALTH_VAR[q.status]}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${dash}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
    );
  };

  return (
    <div dir="rtl" className={s.page}>
      {/* ════════════════════════════════════════════════════════════
          ZONE 1 — COMMAND HERO (dark, signature)
          ════════════════════════════════════════════════════════════ */}
      <section className={s.hero} aria-label="مرکز فرماندهی صف‌ها">
        <div className={s.heroAmbient} aria-hidden="true" />
        <div className={s.heroScanline} aria-hidden="true" />

        <div className={s.heroMain}>
          <HubHeader
            backHref="/dashboard/jobs"
            backLabel="بازگشت به مرکز Job"
            title="عملیات صف‌ها"
            subtitle="جریان زنده‌ی هر صف، بار لحظه‌ای، و سلامت هر pipeline. هر چه اینجا می‌بینید از داده‌های واقعی سامانه است."
            icon={ListTree}
            actions={
              <>
                <span className={s.heroPill} data-tone={overallHealth}>
                  <span
                    aria-hidden
                    className={`${s.heroPillDot} ${s[`heroHealthDot--${overallHealth}`]}`}
                  />
                  {overallHealthLabel[overallHealth]}
                </span>
                <Link href="/dashboard/jobs" className={s.heroLink}>
                  <ArrowLeft size={13} aria-hidden />
                  مرکز Job
                </Link>
              </>
            }
          />

          <div className={s.heroRow}>
            <div className={s.heroStat} data-tone="indigo">
              <span className={s.heroStatLabel}>صف‌های فعال</span>
              <span className={s.heroStatValue}>{fmtPersian(queues.length)}</span>
              <span className={s.heroStatSub}>خط لوله‌ی شناسایی‌شده</span>
            </div>
            <div className={s.heroStat} data-tone="emerald">
              <span className={s.heroStatLabel}>توان پیک</span>
              <span className={s.heroStatValue}>
                {fmtPersian(peakHour.value)}
                <span className={s.heroStatUnit}>job/h</span>
              </span>
              <span className={s.heroStatSub}>
                ساعت {toPersianDigits(peakHour.hour.toString().padStart(2, '0'))}:۰۰
              </span>
            </div>
            <div className={s.heroStat} data-tone="amber">
              <span className={s.heroStatLabel}>بار لحظه‌ای</span>
              <span className={s.heroStatValue}>{fmtPersian(metrics.pending + metrics.running)}</span>
              <span className={s.heroStatSub}>
                <LiveDot tone="amber" size="xs" />
                <span style={{ marginInlineStart: 4 }}>{fmtPersian(metrics.running)} در حال اجرا</span>
              </span>
            </div>
            <div className={s.heroStat} data-tone="rose">
              <span className={s.heroStatLabel}>ناموفق ۲۴ ساعت</span>
              <span className={s.heroStatValue}>{fmtPersian(metrics.failed24h)}</span>
              <span className={s.heroStatSub}>
                {metrics.dead > 0 ? `${fmtPersian(metrics.dead)} در صف مرده` : 'هیچ مورد مرده‌ای'}
              </span>
            </div>
          </div>
        </div>

        <div className={s.heroConstellation} aria-hidden="true">
          <div className={s.heroConstellationHead}>
            <span className={s.heroConstellationEyebrow}>Queue Constellation</span>
            <span className={s.heroConstellationSub}>مدار صف‌ها — هر node یک pipeline</span>
          </div>
          <div className={s.constellationFrame}>{renderConstellation()}</div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 2 — PULSE (light) — vitals + throughput
          ════════════════════════════════════════════════════════════ */}
      <section className={s.pulse} aria-label="شاخص‌های عملکرد">
        <div className={s.pulseCard}>
          <div className={s.pulseHead}>
            <div>
              <span className={s.pulseEyebrow}>System Pulse</span>
              <h3 className={s.pulseTitle}>رودخانه‌ی توان ۲۴ ساعت</h3>
            </div>
            <div className={s.pulseMeta}>
              <span className={s.pulseMetaItem}>
                <span className={s.pulseMetaDot} data-tone="emerald" />
                موفق
              </span>
              <span className={s.pulseMetaItem}>
                <span className={s.pulseMetaDot} data-tone="rose" />
                ناموفق
              </span>
              <span className={s.pulseMetaItem}>
                <span className={s.pulseMetaValue}>{fmtPersian(metrics.completed24h)}</span>
                job/h
              </span>
            </div>
          </div>
          <ThroughputRiver values={hourly} failedValues={deriveFailedByHour(jobs)} />
        </div>

        <div className={s.pulseGrid}>
          <div className={s.pulseStat} data-tone="indigo">
            <span className={s.pulseStatIcon}>
              <ListTree size={16} aria-hidden />
            </span>
            <span className={s.pulseStatLabel}>صف‌ها</span>
            <span className={s.pulseStatValue}>{fmtPersian(queues.length)}</span>
            <span className={s.pulseStatHint}>خط لوله‌ی فعال</span>
          </div>
          <div className={s.pulseStat} data-tone="amber">
            <span className={s.pulseStatIcon}>
              <RefreshCw size={16} aria-hidden />
            </span>
            <span className={s.pulseStatLabel}>در انتظار</span>
            <span className={s.pulseStatValue}>{fmtPersian(metrics.pending)}</span>
            <span className={s.pulseStatHint}>job در صف</span>
          </div>
          <div className={s.pulseStat} data-tone="cyan">
            <span className={s.pulseStatIcon}>
              <Cpu size={16} aria-hidden />
            </span>
            <span className={s.pulseStatLabel}>در حال اجرا</span>
            <span className={s.pulseStatValue}>{fmtPersian(metrics.running)}</span>
            <span className={s.pulseStatHint}>worker فعال</span>
          </div>
          <div className={s.pulseStat} data-tone="rose">
            <span className={s.pulseStatIcon}>
              <Trash2 size={16} aria-hidden />
            </span>
            <span className={s.pulseStatLabel}>ناموفق</span>
            <span className={s.pulseStatValue}>{fmtPersian(metrics.failed24h)}</span>
            <span className={s.pulseStatHint}>۲۴ ساعت اخیر</span>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 3 — QUEUE FIELD (signature, light)
          ════════════════════════════════════════════════════════════ */}
      <section className={s.field} aria-label="پروفایل هر صف">
        <div className={s.fieldHead}>
          <div>
            <span className={s.fieldEyebrow}>Queue Field</span>
            <h2 className={s.fieldTitle}>پروفایل هر صف</h2>
            <p className={s.fieldLead}>
              برای هر صف، سلامت کلی، بار لحظه‌ای، و نوع jobهایی که اخیراً از آن عبور کرده‌اند.
            </p>
          </div>
          <div className={s.fieldMeta}>
            <span className={s.fieldMetaChip}>
              <Activity size={12} aria-hidden />
              {fmtPersian(queueHealth.length)} صف
            </span>
          </div>
        </div>

        {queueHealth.length === 0 ? (
          <div className={s.fieldEmpty}>
            <ListTree size={28} aria-hidden />
            <p>هنوز هیچ صف فعالی شناسایی نشده است.</p>
            <p className={s.fieldEmptySub}>به محض ثبت اولین job، pipeline اینجا نمایش داده می‌شود.</p>
          </div>
        ) : (
          <div className={s.fieldGrid}>
            {queueHealth.map((q) => {
              const types = typesByQueue.get(q.name) ?? [];
              const totalLoad = q.pending + q.running + q.dead;
              return (
                <article key={q.name} className={s.qCard} data-tone={q.status}>
                  <div className={s.qCardHeader}>
                    <div className={s.qCardHealth}>
                      <div className={s.qCardRing}>{renderHealthRing(q, 56)}</div>
                      <div className={s.qCardScore}>
                        <span className={s.qCardScoreValue}>{fmtPersian(Math.round(q.score))}</span>
                        <span className={s.qCardScoreLabel}>score</span>
                      </div>
                    </div>
                    <div className={s.qCardTitle}>
                      <span className={s.qCardName}>{q.name}</span>
                      <span className={s.qCardStatus} data-tone={q.status}>
                        {HEALTH_LABEL[q.status]}
                      </span>
                    </div>
                  </div>

                  <div className={s.qCardMetrics}>
                    <div className={s.qCardMetric}>
                      <span className={s.qCardMetricLabel}>در انتظار</span>
                      <span className={s.qCardMetricValue} data-tone="amber">
                        {fmtPersian(q.pending)}
                      </span>
                    </div>
                    <div className={s.qCardMetric}>
                      <span className={s.qCardMetricLabel}>در حال اجرا</span>
                      <span className={s.qCardMetricValue} data-tone="cyan">
                        {fmtPersian(q.running)}
                      </span>
                    </div>
                    <div className={s.qCardMetric}>
                      <span className={s.qCardMetricLabel}>۲۴ ساعت</span>
                      <span className={s.qCardMetricValue} data-tone="indigo">
                        {fmtPersian(q.completed24h)}
                      </span>
                    </div>
                    <div className={s.qCardMetric}>
                      <span className={s.qCardMetricLabel}>ناموفق</span>
                      <span
                        className={s.qCardMetricValue}
                        data-tone={q.failed24h > 0 ? 'rose' : 'muted'}
                      >
                        {fmtPersian(q.failed24h)}
                      </span>
                    </div>
                  </div>

                  <div className={s.qCardLoad}>
                    <div className={s.qCardLoadTrack}>
                      <div
                        className={s.qCardLoadFill}
                        data-tone={q.status}
                        style={{ width: `${Math.min(100, Math.max(2, (totalLoad / Math.max(queues.length, 1)) * 12))}%` }}
                      />
                    </div>
                    <div className={s.qCardLoadMeta}>
                      <span>
                        نرخ خطا{' '}
                        <strong>{q.failureRate > 0 ? `${fmtPersian(q.failureRate.toFixed(1))}٪` : '—'}</strong>
                      </span>
                      {q.dead > 0 ? (
                        <span className={s.qCardLoadDead}>
                          <Trash2 size={11} aria-hidden /> {fmtPersian(q.dead)} مرده
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {types.length > 0 ? (
                    <div className={s.qCardTypes}>
                      <span className={s.qCardTypesLabel}>
                        <Hash size={11} aria-hidden /> نوع job
                      </span>
                      <div className={s.qCardTypesList}>
                        {types.map((t) => (
                          <span key={t.type} className={s.qCardTypeChip}>
                            <span className={s.qCardTypeName}>{t.type}</span>
                            <span className={s.qCardTypeCount}>{fmtPersian(t.count)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 4 — LIVE JOB STREAM
          ════════════════════════════════════════════════════════════ */}
      <section className={s.stream} aria-label="جریان زنده jobها">
        <div className={s.streamHead}>
          <div>
            <span className={s.streamEyebrow}>Live Job Stream</span>
            <h2 className={s.streamTitle}>jobهای اخیر به تفکیک صف</h2>
            <p className={s.streamLead}>
              جدیدترین jobهای سامانه. می‌توانید بر اساس وضعیت یا صف فیلتر کنید.
            </p>
          </div>
          <div className={s.streamToolbar}>
            <div className={s.streamSearch}>
              <Search size={13} aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جست‌وجو در نوع، صف یا شناسه…"
                aria-label="جست‌وجو در jobها"
              />
            </div>
          </div>
        </div>

        <div className={s.streamFilters}>
          <div className={s.streamFilterGroup}>
            <Filter size={12} aria-hidden />
            <span className={s.streamFilterLabel}>وضعیت:</span>
            {(['all', 'pending', 'running', 'completed', 'failed', 'dead'] as const).map((st) => (
              <button
                key={st}
                type="button"
                className={s.streamFilterPill}
                data-active={statusFilter === st}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all' ? 'همه' : STATUS_LABEL[st]}
              </button>
            ))}
          </div>
          <div className={s.streamFilterGroup}>
            <ListTree size={12} aria-hidden />
            <span className={s.streamFilterLabel}>صف:</span>
            <button
              type="button"
              className={s.streamFilterPill}
              data-active={queueFilter === 'all'}
              onClick={() => setQueueFilter('all')}
            >
              همه
            </button>
            {queueHealth.map((q) => (
              <button
                key={q.name}
                type="button"
                className={s.streamFilterPill}
                data-active={queueFilter === q.name}
                onClick={() => setQueueFilter(q.name)}
              >
                {q.name}
              </button>
            ))}
          </div>
        </div>

        {streamJobs.length === 0 ? (
          <div className={s.streamEmpty}>
            <p>هیچ job‌ای با این فیلتر یافت نشد.</p>
          </div>
        ) : (
          <div className={s.streamTable} role="table">
            <div className={s.streamRow} role="row" data-header>
              <div role="columnheader">نوع job</div>
              <div role="columnheader">صف</div>
              <div role="columnheader">وضعیت</div>
              <div role="columnheader">تلاش</div>
              <div role="columnheader">اولویت</div>
              <div role="columnheader">زمان</div>
            </div>
            {streamJobs.map((j) => (
              <Link
                key={j.id}
                href={`/dashboard/jobs/${j.id}`}
                className={s.streamRow}
                role="row"
                data-status={j.status}
              >
                <div className={s.streamCellType} role="cell">
                  <span className={s.streamDot} data-status={j.status} aria-hidden />
                  <span className={s.streamType}>{j.type}</span>
                </div>
                <div className={s.streamCellQueue} role="cell">
                  {j.queue}
                </div>
                <div role="cell">
                  <span className={s.streamStatus} data-status={j.status}>
                    {STATUS_LABEL[j.status]}
                  </span>
                </div>
                <div className={s.streamCellMono} role="cell">
                  {j.attempts}/{j.maxAttempts}
                </div>
                <div className={s.streamCellMono} role="cell">
                  {j.attempts > 1 ? `×${j.attempts}` : '—'}
                </div>
                <div className={s.streamCellTime} role="cell">
                  {formatRelative(j.completedAt ?? j.failedAt ?? j.startedAt ?? j.createdAt)}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className={s.streamFooter}>
          <span className={s.streamFooterMeta}>
            نمایش {fmtPersian(streamJobs.length)} از {fmtPersian(jobs.length)} job
          </span>
          <Link href="/dashboard/jobs/new" className={s.streamFooterAction}>
            <Zap size={12} aria-hidden />
            ساخت job جدید
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * ThroughputRiver — dual-track area chart for completed + failed
 * ───────────────────────────────────────────────────────────── */
function deriveFailedByHour(jobs: Job[]): number[] {
  const now = Date.now();
  const out = new Array(24).fill(0);
  for (const j of jobs) {
    if (j.status !== 'failed' && j.status !== 'dead') continue;
    const at = j.failedAt ?? j.completedAt ?? j.startedAt ?? j.createdAt;
    if (!at) continue;
    const hAgo = Math.floor((now - new Date(at).getTime()) / (60 * 60 * 1000));
    if (hAgo >= 0 && hAgo < 24) {
      out[23 - hAgo] = (out[23 - hAgo] ?? 0) + 1;
    }
  }
  return out;
}

function ThroughputRiver({
  values,
  failedValues,
}: {
  values: number[];
  failedValues: number[];
}) {
  const w = 100;
  const h = 32;
  if (values.length === 0) {
    return <div className={s.riverEmpty}>داده‌ای برای نمایش وجود ندارد.</div>;
  }
  const max = Math.max(...values, ...failedValues, 1);
  const stepX = w / Math.max(values.length - 1, 1);

  const buildPath = (data: number[]) =>
    data
      .map((v, i) => `${(i * stepX).toFixed(2)},${(h - (v / max) * h).toFixed(2)}`)
      .join(' ');

  const completedPath = buildPath(values);
  const failedPath = buildPath(failedValues);
  const completedArea = `0,${h} ${completedPath} ${w},${h}`;
  const failedArea = `0,${h} ${failedPath} ${w},${h}`;

  const peakIndex = values.indexOf(max);

  return (
    <div className={s.river}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className={s.riverSvg}
        aria-label="رودخانه توان ۲۴ ساعت"
      >
        <defs>
          <linearGradient id="q-river-completed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(60% 0.1 165 / 0.45)" />
            <stop offset="100%" stopColor="oklch(60% 0.1 165 / 0)" />
          </linearGradient>
          <linearGradient id="q-river-failed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(60% 0.13 20 / 0.5)" />
            <stop offset="100%" stopColor="oklch(60% 0.13 20 / 0)" />
          </linearGradient>
        </defs>

        {/* baseline grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={0}
            x2={w}
            y1={h * p}
            y2={h * p}
            stroke="currentColor"
            strokeOpacity={0.05}
            strokeWidth="0.2"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* completed area */}
        <polygon points={completedArea} fill="url(#q-river-completed)" />
        <polyline
          points={completedPath}
          fill="none"
          stroke="oklch(60% 0.1 165)"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* failed line */}
        <polygon points={failedArea} fill="url(#q-river-failed)" />
        <polyline
          points={failedPath}
          fill="none"
          stroke="oklch(60% 0.13 20)"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="1 1"
        />

        {/* peak marker */}
        {peakIndex >= 0 && values[peakIndex] > 0 ? (
          <g>
            <line
              x1={peakIndex * stepX}
              x2={peakIndex * stepX}
              y1={0}
              y2={h}
              stroke="currentColor"
              strokeOpacity="0.18"
              strokeWidth="0.2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={peakIndex * stepX}
              cy={h - (values[peakIndex] / max) * h}
              r="0.8"
              fill="oklch(60% 0.1 165)"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ) : null}
      </svg>

      <div className={s.riverAxis}>
        {values.map((_, i) =>
          i % 6 === 0 ? (
            <span key={i} className={s.riverAxisLabel}>
              {toPersianDigits(((23 - i) % 24).toString().padStart(2, '0'))}
            </span>
          ) : (
            <span key={i} className={s.riverAxisDot} />
          ),
        )}
      </div>
    </div>
  );
}

export default QueuesView;
