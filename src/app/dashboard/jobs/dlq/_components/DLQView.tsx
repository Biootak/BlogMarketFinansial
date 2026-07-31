'use client';

/**
 * DLQView — Dead Letter Forensics
 * ─────────────────────────────────────────────────────────────
 *  فلسفه: ۴ zone بصری اصلی
 *    1. FORENSIC HERO (dark, signature) — X-ray pulse + ۳ mini stat
 *    2. FAILURE DNA (light) — توپولوژی علت شکست
 *    3. FORENSIC TIMELINE (signature) — جدول عمودی forensic
 *    4. RECOVERY PLAYBOOK (utility) — راهنمای عمل
 *
 *  تنظیمات:
 *   - ۳ tone: rose (dominant) + amber (warning) + indigo (utility)
 *   - ۱ overlay: scanline در HERO
 *   - ۲ motion: pulse + scan
 *   - ۱ SVG signature: X-Ray Pulse در HERO
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  ArrowLeft,
  Clock,
  Filter,
  Flame,
  Hash,
  ListTree,
  RotateCcw,
  Search,
  Skull,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toPersianDigits } from '@/lib/setup/format';
import { HubHeader, LiveDot } from '@/components/Dashboard/PlatformHub';
import s from './DLQ.module.css';

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

interface DLQViewProps {
  jobs: Job[];
  deadCount: number;
  failedCount: number;
  totalJobs: number;
  completed24h: number;
}

const STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'در انتظار',
  running: 'در حال اجرا',
  completed: 'تکمیل',
  failed: 'ناموفق',
  dead: 'مرده',
};

const FAILURE_CATEGORY: { type: string; label: string; tone: string; icon: typeof Flame }[] = [
  { type: 'TIMEOUT', label: 'پایان زمان', tone: 'amber', icon: Clock },
  { type: 'NETWORK', label: 'خطای شبکه', tone: 'cyan', icon: XCircle },
  { type: 'RUNTIME', label: 'خطای اجرا', tone: 'rose', icon: AlertOctagon },
  { type: 'VALIDATION', label: 'اعتبارسنجی', tone: 'indigo', icon: Terminal },
];

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

function deriveFailureCategory(job: Job): string {
  // heuristic: infer from job type
  if (job.attempts >= job.maxAttempts) return 'TIMEOUT';
  if (job.type.includes('fetch') || job.type.includes('http') || job.type.includes('api')) return 'NETWORK';
  if (job.type.includes('validate') || job.type.includes('check')) return 'VALIDATION';
  return 'RUNTIME';
}

export function DLQView({ jobs, deadCount, failedCount, totalJobs, completed24h }: DLQViewProps) {
  const [search, setSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'dead' | 'failed'>('all');

  // ── derived: queue breakdown for failure
  const queueBreakdown = useMemo(() => {
    const map = new Map<string, { dead: number; failed: number; total: number }>();
    for (const j of jobs) {
      const e = map.get(j.queue) ?? { dead: 0, failed: 0, total: 0 };
      if (j.status === 'dead') e.dead += 1;
      if (j.status === 'failed') e.failed += 1;
      e.total += 1;
      map.set(j.queue, e);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [jobs]);

  // ── derived: failure category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of jobs) {
      const cat = deriveFailureCategory(j);
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    const total = Math.max(jobs.length, 1);
    return FAILURE_CATEGORY.map((c) => ({
      ...c,
      count: map.get(c.type) ?? 0,
      share: ((map.get(c.type) ?? 0) / total) * 100,
    })).sort((a, b) => b.count - a.count);
  }, [jobs]);

  // ── derived: filtered jobs
  const filtered = useMemo(() => {
    let list = jobs;
    if (statusFilter !== 'all') list = list.filter((j) => j.status === statusFilter);
    if (queueFilter !== 'all') list = list.filter((j) => j.queue === queueFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (j) => j.type.toLowerCase().includes(q) || j.queue.toLowerCase().includes(q) || j.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [jobs, search, queueFilter, statusFilter]);

  // ── derived: failure rate
  const failureRate = totalJobs > 0 ? (failedCount / totalJobs) * 100 : 0;

  // ── render: X-ray pulse SVG
  const renderXRayPulse = () => {
    const size = 320;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = 140;
    const totalJobsFmt = fmtPersian(deadCount + failedCount);
    return (
      <svg viewBox={`0 0 ${size} ${size}`} className={s.xraySvg} aria-hidden="true">
        <defs>
          <radialGradient id="dlq-xray-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="60%" stopColor="currentColor" stopOpacity="0.1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dlq-xray-wave" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* concentric rings — like a sonar */}
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <circle
            key={p}
            cx={cx}
            cy={cy}
            r={maxR * p}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12 - p * 0.08}
            strokeWidth="1"
          />
        ))}

        {/* cross-hair guides */}
        <line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        <line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />

        {/* core glow */}
        <circle cx={cx} cy={cy} r={maxR} fill="url(#dlq-xray-core)" />
        <circle cx={cx} cy={cy} r={38} fill="currentColor" fillOpacity="0.12" />
        <circle cx={cx} cy={cy} r={20} fill="currentColor" fillOpacity="0.25" />

        {/* X-ray skull mark — abstract */}
        <g transform={`translate(${cx} ${cy})`}>
          <circle r="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
          <circle r="32" fill="currentColor" fillOpacity="0.04" />
          <path
            d="M-12,-6 Q-12,-14 -6,-14 Q0,-14 0,-6 Q0,-14 6,-14 Q12,-14 12,-6 L12,4 L8,8 L4,8 L4,12 L-4,12 L-4,8 L-8,8 L-12,4 Z"
            fill="currentColor"
            fillOpacity="0.85"
            stroke="currentColor"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          <circle cx="-6" cy="-6" r="2" fill="oklch(15% 0.02 20)" />
          <circle cx="6" cy="-6" r="2" fill="oklch(15% 0.02 20)" />
        </g>

        {/* center count */}
        <text
          x={cx}
          y={cy + 76}
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill="currentColor"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {totalJobsFmt}
        </text>
        <text
          x={cx}
          y={cy + 92}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill="currentColor"
          fillOpacity="0.7"
          letterSpacing="0.18em"
        >
          مورد بحرانی
        </text>

        {/* pulse wave — animated circles */}
        <circle cx={cx} cy={cy} r="30" fill="none" stroke="currentColor" strokeWidth="1.5" className={s.xrayPulse1} />
        <circle cx={cx} cy={cy} r="30" fill="none" stroke="currentColor" strokeWidth="1.5" className={s.xrayPulse2} />
        <circle cx={cx} cy={cy} r="30" fill="none" stroke="currentColor" strokeWidth="1.5" className={s.xrayPulse3} />
      </svg>
    );
  };

  return (
    <div dir="rtl" className={s.page}>
      {/* ════════════════════════════════════════════════════════════
          ZONE 1 — FORENSIC HERO (dark, signature)
          ════════════════════════════════════════════════════════════ */}
      <section className={s.hero} aria-label="Forensic">
        <div className={s.heroAmbient} aria-hidden="true" />
        <div className={s.heroScan} aria-hidden="true" />

        <div className={s.heroMain}>
          <HubHeader
            backHref="/dashboard/jobs"
            backLabel="بازگشت به مرکز Job"
            title="Forensics: صف مرده"
            subtitle="هر job اینجا داستانی دارد. آن را بخوانید، علت شکست را ریشه‌یابی کنید، و تصمیم بگیرید: retry، اصلاح، یا دور انداختن."
            icon={Skull}
            variant="dark"
            actions={
              <>
                <span className={s.heroPill} data-tone={deadCount > 0 ? 'critical' : 'healthy'}>
                  <span className={s.heroPillDot} />
                  {deadCount > 0 ? `${fmtPersian(deadCount)} مورد نیاز به تصمیم` : 'صف مرده پاک است'}
                </span>
                <Link href="/dashboard/jobs" className={s.heroLink}>
                  <ArrowLeft size={13} aria-hidden />
                  مرکز Job
                </Link>
              </>
            }
          />

          <div className={s.heroRow}>
            <div className={s.heroStat} data-tone="rose">
              <span className={s.heroStatLabel}>مرده (Dead)</span>
              <span className={s.heroStatValue}>{fmtPersian(deadCount)}</span>
              <span className={s.heroStatSub}>
                <LiveDot tone="rose" size="xs" />
                <span style={{ marginInlineStart: 4 }}>تعداد jobهای نامید</span>
              </span>
            </div>
            <div className={s.heroStat} data-tone="amber">
              <span className={s.heroStatLabel}>ناموفق ۲۴ ساعت</span>
              <span className={s.heroStatValue}>{fmtPersian(failedCount)}</span>
              <span className={s.heroStatSub}>
                {failureRate > 0 ? `${fmtPersian(parseFloat(failureRate.toFixed(1)))}٪ از کل jobها` : 'نرخ صفر'}
              </span>
            </div>
            <div className={s.heroStat} data-tone="indigo">
              <span className={s.heroStatLabel}>کل jobها</span>
              <span className={s.heroStatValue}>{fmtPersian(totalJobs)}</span>
              <span className={s.heroStatSub}>در ۲۴ ساعت گذشته</span>
            </div>
            <div className={s.heroStat} data-tone="emerald">
              <span className={s.heroStatLabel}>موفق ۲۴ ساعت</span>
              <span className={s.heroStatValue}>{fmtPersian(completed24h)}</span>
              <span className={s.heroStatSub}>نسبت موفقیت</span>
            </div>
          </div>
        </div>

        <div className={s.heroXRay} aria-hidden="true">
          <div className={s.heroXRayHead}>
            <span className={s.heroXRayEyebrow}>X-Ray Pulse</span>
            <span className={s.heroXRaySub}>اسکن زنده‌ی jobهای بحرانی</span>
          </div>
          <div className={s.xrayFrame}>{renderXRayPulse()}</div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 2 — FAILURE DNA (light)
          ════════════════════════════════════════════════════════════ */}
      <section className={s.dna} aria-label="DNAی شکست">
        <div className={s.dnaGrid}>
          <div className={s.dnaCard}>
            <div className={s.dnaCardHead}>
              <div>
                <span className={s.dnaEyebrow}>Failure DNA</span>
                <h3 className={s.dnaTitle}>توپولوژی علت شکست</h3>
              </div>
              <Flame size={16} aria-hidden className={s.dnaIcon} />
            </div>
            <div className={s.dnaList}>
              {categoryBreakdown.length === 0 ? (
                <div className={s.dnaEmpty}>هیچ مورد ناموفقی برای تحلیل وجود ندارد.</div>
              ) : (
                categoryBreakdown.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.type} className={s.dnaItem} data-tone={c.tone}>
                      <span className={s.dnaItemIcon}>
                        <Icon size={14} aria-hidden />
                      </span>
                      <span className={s.dnaItemLabel}>{c.label}</span>
                      <span className={s.dnaItemBar} aria-hidden>
                        <span className={s.dnaItemFill} style={{ inlineSize: `${Math.max(2, c.share)}%` }} />
                      </span>
                      <span className={s.dnaItemValue}>{fmtPersian(c.count)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={s.dnaCard}>
            <div className={s.dnaCardHead}>
              <div>
                <span className={s.dnaEyebrow}>Queue Heat</span>
                <h3 className={s.dnaTitle}>شکست به تفکیک صف</h3>
              </div>
              <ListTree size={16} aria-hidden className={s.dnaIcon} />
            </div>
            <div className={s.dnaList}>
              {queueBreakdown.length === 0 ? (
                <div className={s.dnaEmpty}>هیچ صف فعالی گزارش نشده است.</div>
              ) : (
                queueBreakdown.map((q) => (
                  <div key={q.name} className={s.queueRow} data-tone={q.dead > 0 ? 'critical' : q.failed > 0 ? 'degraded' : 'healthy'}>
                    <div className={s.queueRowName}>
                      <Hash size={11} aria-hidden />
                      <span>{q.name}</span>
                    </div>
                    <div className={s.queueRowStats}>
                      <span className={s.queueRowStat} data-tone="rose">
                        <span className={s.queueRowStatDot} />
                        {fmtPersian(q.dead)} مرده
                      </span>
                      <span className={s.queueRowStat} data-tone="amber">
                        <span className={s.queueRowStatDot} />
                        {fmtPersian(q.failed)} ناموفق
                      </span>
                      <span className={s.queueRowStat} data-tone="muted">
                        مجموع {fmtPersian(q.total)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 3 — FORENSIC TABLE
          ════════════════════════════════════════════════════════════ */}
      <section className={s.forensics} aria-label="جدول forensic">
        <div className={s.forensicsHead}>
          <div>
            <span className={s.forensicsEyebrow}>Forensic Stream</span>
            <h2 className={s.forensicsTitle}>jobهای ناموفق و مرده</h2>
            <p className={s.forensicsLead}>
              فیلتر، جست‌وجو، و بررسی هر job. با کلیک روی هر ردیف به صفحه‌ی جزئیات هدایت می‌شوید.
            </p>
          </div>
          <div className={s.forensicsToolbar}>
            <div className={s.forensicsSearch}>
              <Search size={13} aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جست‌وجو در نوع، صف یا شناسه…"
                aria-label="جست‌وجو در DLQ"
              />
            </div>
          </div>
        </div>

        <div className={s.forensicsFilters}>
          <div className={s.forensicsFilterGroup}>
            <Filter size={12} aria-hidden />
            <span className={s.forensicsFilterLabel}>وضعیت:</span>
            {(['all', 'dead', 'failed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                className={s.forensicsFilterPill}
                data-active={statusFilter === st}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all' ? 'همه' : STATUS_LABEL[st]}
              </button>
            ))}
          </div>
          <div className={s.forensicsFilterGroup}>
            <ListTree size={12} aria-hidden />
            <span className={s.forensicsFilterLabel}>صف:</span>
            <button
              type="button"
              className={s.forensicsFilterPill}
              data-active={queueFilter === 'all'}
              onClick={() => setQueueFilter('all')}
            >
              همه
            </button>
            {queueBreakdown.map((q) => (
              <button
                key={q.name}
                type="button"
                className={s.forensicsFilterPill}
                data-active={queueFilter === q.name}
                onClick={() => setQueueFilter(q.name)}
              >
                {q.name}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={s.forensicsEmpty}>
            <Skull size={28} aria-hidden />
            <p>هیچ job ناموفقی با این فیلتر یافت نشد.</p>
            <p className={s.forensicsEmptySub}>
              {jobs.length === 0
                ? 'سامانه در ۲۴ ساعت گذشته هیچ job ناموفقی نداشته است.'
                : 'فیلتر فعلی نتیجه‌ای ندارد. فیلتر را تغییر دهید.'}
            </p>
          </div>
        ) : (
          <div className={s.forensicsTable} role="table">
            <div className={s.forensicsRow} role="row" data-header>
              <div role="columnheader">job</div>
              <div role="columnheader">صف</div>
              <div role="columnheader">دسته شکست</div>
              <div role="columnheader">تلاش</div>
              <div role="columnheader">اولویت</div>
              <div role="columnheader">زمان شکست</div>
              <div role="columnheader">اقدام</div>
            </div>
            {filtered.slice(0, 30).map((j) => {
              const cat = categoryBreakdown.find((c) => c.type === deriveFailureCategory(j));
              return (
                <div key={j.id} className={s.forensicsRow} role="row" data-status={j.status}>
                  <Link href={`/dashboard/jobs/${j.id}`} className={s.forensicsCellJob} role="cell">
                    <span className={s.forensicsDot} data-status={j.status} aria-hidden />
                    <span className={s.forensicsJobType}>{j.type}</span>
                    <span className={s.forensicsJobId}>{j.id.slice(0, 8)}</span>
                  </Link>
                  <div className={s.forensicsCellQueue} role="cell">
                    {j.queue}
                  </div>
                  <div role="cell">
                    {cat ? (
                      <span className={s.forensicsCat} data-tone={cat.tone}>
                        {cat.label}
                      </span>
                    ) : (
                      <span className={s.forensicsCatMuted}>—</span>
                    )}
                  </div>
                  <div className={s.forensicsCellMono} role="cell">
                    {j.attempts}/{j.maxAttempts}
                  </div>
                  <div className={s.forensicsCellMono} role="cell">
                    {j.attempts > 1 ? `×${j.attempts}` : '—'}
                  </div>
                  <div className={s.forensicsCellTime} role="cell">
                    {formatRelative(j.failedAt ?? j.completedAt ?? j.startedAt ?? j.createdAt)}
                  </div>
                  <div className={s.forensicsCellAction} role="cell">
                    <button
                      type="button"
                      className={s.forensicsBtn}
                      data-action="retry"
                      aria-label="تلاش مجدد"
                    >
                      <RotateCcw size={11} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={s.forensicsBtn}
                      data-action="delete"
                      aria-label="حذف"
                    >
                      <Trash2 size={11} aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className={s.forensicsFooter}>
          <span className={s.forensicsFooterMeta}>
            نمایش {fmtPersian(Math.min(filtered.length, 30))} از {fmtPersian(filtered.length)} مورد
          </span>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 4 — RECOVERY PLAYBOOK
          ════════════════════════════════════════════════════════════ */}
      <section className={s.playbook} aria-label="دفترچه راهنما">
        <div className={s.playbookHead}>
          <span className={s.playbookEyebrow}>Recovery Playbook</span>
          <h2 className={s.playbookTitle}>راهنمای عمل</h2>
        </div>
        <div className={s.playbookGrid}>
          <article className={s.playbookCard}>
            <span className={s.playbookCardNumber} aria-hidden>۰۱</span>
            <h3 className={s.playbookCardTitle}>شناسایی</h3>
            <p className={s.playbookCardBody}>
              ابتدا دسته شکست را مشخص کنید. پایان زمان، خطای شبکه، یا خطای منطقی؟ هر دسته راهکار متفاوتی دارد.
            </p>
            <span className={s.playbookCardChip} data-tone="indigo">
              <Terminal size={11} aria-hidden /> forensic
            </span>
          </article>
          <article className={s.playbookCard}>
            <span className={s.playbookCardNumber} aria-hidden>۰۲</span>
            <h3 className={s.playbookCardTitle}>اصلاح یا retry</h3>
            <p className={s.playbookCardBody}>
              اگر داده‌ها سالم هستند، retry خودکار کافی است. در غیر این صورت، داده‌های ورودی یا worker را اصلاح کنید.
            </p>
            <span className={s.playbookCardChip} data-tone="emerald">
              <RotateCcw size={11} aria-hidden /> retry
            </span>
          </article>
          <article className={s.playbookCard}>
            <span className={s.playbookCardNumber} aria-hidden>۰۳</span>
            <h3 className={s.playbookCardTitle}>دور انداختن</h3>
            <p className={s.playbookCardBody}>
              jobهایی که دیگر اهمیتی ندارند یا داده‌های آن‌ها منقضی شده را با دکمه حذف از صف خارج کنید.
            </p>
            <span className={s.playbookCardChip} data-tone="rose">
              <Trash2 size={11} aria-hidden /> discard
            </span>
          </article>
        </div>
      </section>
    </div>
  );
}

export default DLQView;
