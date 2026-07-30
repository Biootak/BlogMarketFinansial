'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Pause,
  Search,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  type ActivityStreamItem,
  ActivityStream,
  type FilterPillItem,
  FilterPills,
  HUB_PALETTES,
  HubShell,
  LiveDot,
  type PillTabItem,
  QueueHeatmap,
  type QueueHeatmapItem,
  ThroughputBars,
  toOklch,
} from '@/components/Dashboard/PlatformHub';
import { StatCard, StatGrid, Section, EmptyState, Spotlight, GeometricAccent } from '@/components/Dashboard/primitives';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import s from './JobCenter.module.css';

type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead';

type Job = {
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
  createdAt: string;
};

type Queue = {
  name: string;
  pending: number;
  running: number;
  failed: number;
};

export interface JobCenterData {
  generatedAt: string;
  jobs: Job[];
  metrics: {
    pending: number;
    running: number;
    completed24h: number;
    failed24h: number;
    dead: number;
    avgDurationMs: number;
  };
  queues: Queue[];
  hourly: number[];
  recentEvents: Array<{
    id: string;
    at: string;
    title: string;
    detail?: string;
    tone?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'violet';
  }>;
}

interface JobCenterProps {
  initialData: JobCenterData;
}

const STATUS_TABS: PillTabItem[] = [
  { id: 'all', label: 'همه' },
  { id: 'running', label: 'در حال اجرا', tone: 'indigo' },
  { id: 'pending', label: 'در انتظار', tone: 'amber' },
  { id: 'failed', label: 'ناموفق', tone: 'rose' },
  { id: 'dead', label: 'مرده', tone: 'rose' },
  { id: 'completed', label: 'تکمیل‌شده', tone: 'emerald' },
];

const STATUS_TONE: Record<JobStatus, 'emerald' | 'indigo' | 'amber' | 'rose' | 'neutral'> = {
  completed: 'emerald',
  running: 'indigo',
  pending: 'amber',
  failed: 'rose',
  dead: 'rose',
};

const STATUS_LABELS: Record<JobStatus, string> = {
  completed: 'تکمیل',
  running: 'در حال اجرا',
  pending: 'در انتظار',
  failed: 'ناموفق',
  dead: 'مرده',
};

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  if (diff < 60_000) return 'لحظاتی پیش';
  if (diff < 3_600_000) return `${fmtPersian(Math.floor(diff / 60_000))} دقیقه پیش`;
  if (diff < 86_400_000) return `${fmtPersian(Math.floor(diff / 3_600_000))} ساعت پیش`;
  return `${fmtPersian(Math.floor(diff / 86_400_000))} روز پیش`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${fmtPersian(Math.round(ms))} میلی‌ثانیه`;
  if (ms < 60_000) return `${fmtPersian(Math.round(ms / 100) / 10)} ثانیه`;
  if (ms < 3_600_000) return `${fmtPersian(Math.round(ms / 60_000))} دقیقه`;
  return `${fmtPersian(Math.round(ms / 3_600_000))} ساعت`;
}

export function JobCenter({ initialData }: JobCenterProps) {
  const [tab, setTab] = useState<string>('all');
  const [queue, setQueue] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const data = initialData;
  const palette = HUB_PALETTES.jobs;
  const primaryColor = toOklch(palette.primary);
  const dangerColor = toOklch(palette.danger);

  const queueFilters: FilterPillItem[] = useMemo(() => {
    const counts: Record<string, number> = { all: data.jobs.length };
    for (const j of data.jobs) {
      counts[j.queue] = (counts[j.queue] ?? 0) + 1;
    }
    return [
      { id: 'all', label: 'همه صف‌ها', count: counts.all },
      ...data.queues.map((q) => ({
        id: q.name,
        label: q.name,
        count: counts[q.name] ?? 0,
      })),
    ];
  }, [data]);

  const filtered = useMemo(() => {
    let result = data.jobs;
    if (tab !== 'all') {
      result = result.filter((j) => j.status === tab);
    }
    if (queue !== 'all') {
      result = result.filter((j) => j.queue === queue);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (j) => j.type.toLowerCase().includes(q) || j.id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data.jobs, tab, queue, query]);

  const heatmap: QueueHeatmapItem[] = useMemo(() => {
    const totalLoad = Math.max(
      data.queues.reduce((s, q) => s + q.pending + q.running, 0),
      1
    );
    return data.queues.map((q) => {
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
  }, [data]);

  const activityItems: ActivityStreamItem[] = useMemo(
    () => data.recentEvents.map((e) => ({
      id: e.id,
      at: e.at,
      title: e.title,
      detail: e.detail,
      tone: e.tone,
    })),
    [data]
  );

  return (
    <HubShell
      meta={{
        eyebrow: 'مرکز Job پلتفرم',
        title: 'مرکز Job',
        subtitle:
          'تمام jobهای پس‌زمینه، صف‌ها، retry و DLQ. هر job، هر صف، هر خطا — در یک نگاه.',
        breadcrumb: [
          { href: '/dashboard', label: 'داشبورد' },
          { label: 'مرکز Job' },
        ],
        badges: [
          { label: 'صف فعال', tone: 'emerald', live: true },
          { label: `${fmtPersian(data.queues.length)} صف`, tone: 'indigo' },
          { label: `${fmtPersian(data.metrics.dead)} در DLQ`, tone: data.metrics.dead > 0 ? 'rose' : 'neutral' },
        ],
        actions: (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/jobs/queues">
                <Activity size={14} aria-hidden />
                آمار صف‌ها
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/jobs/dlq">
                <Trash2 size={14} aria-hidden />
                صف مرده
              </Link>
            </Button>
          </>
        ),
      }}
      tabs={STATUS_TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {/* KPI grid — StatCard کانونیکال */}
      <StatGrid className={s.kpiGrid}>
        <StatCard
          label="توان ۲۴ ساعت"
          value={data.metrics.completed24h}
          icon={Zap}
          info="job تکمیل‌شده"
          format="persian"
        />
        <StatCard
          label="در حال اجرا"
          value={data.metrics.running}
          icon={Loader2}
          info="پردازش همین لحظه"
          format="persian"
        />
        <StatCard
          label="ناموفق"
          value={data.metrics.failed24h}
          icon={XCircle}
          info="در ۲۴ ساعت"
          format="persian"
        />
        <StatCard
          label="صف مرده"
          value={data.metrics.dead}
          icon={Trash2}
          info="نیاز به retry"
          format="persian"
        />
        <StatCard
          label="میانگین زمان"
          value={data.metrics.avgDurationMs}
          icon={Clock}
          info="هر job"
          format="compact"
        />
        <StatCard
          label="صف‌ها"
          value={data.queues.length}
          icon={Activity}
          info="صف فعال"
          format="persian"
        />
      </StatGrid>

      {/* analytics: throughput + heatmap — استفاده از Section کانونیکال */}
      <div className={s.analyticsGrid}>
        <Section
          title="رودخانه توان"
          description={`توان ۲۴ ساعت — اوج: ${fmtPersian(Math.max(...data.hourly, 0))} job/ساعت`}
          actions={<LiveDot tone="emerald" size="sm" label="همین لحظه" />}
          icon={Zap}
        >
          <Card className={s.analyticsCard}>
            <Spotlight tone="indigo" />
            <GeometricAccent variant="qtr" position="top-right" />
            <CardContent className={s.analyticsContent}>
              <ThroughputBars values={data.hourly} tone="indigo" height={160} />
              <div className={s.analyticsFoot}>
                <span>
                  <span className={s.footKey}>اوج ساعتی</span>
                  <span className={s.footVal}>{fmtPersian(Math.max(...data.hourly, 0))}</span>
                </span>
                <span>
                  <span className={s.footKey}>میانگین</span>
                  <span className={s.footVal}>
                    {fmtPersian(
                      Math.round(
                        data.hourly.reduce((a, b) => a + b, 0) /
                          Math.max(data.hourly.length, 1),
                      ),
                    )}
                  </span>
                </span>
                <span>
                  <span className={s.footKey}>کل</span>
                  <span className={s.footVal}>{fmtPersian(data.hourly.reduce((a, b) => a + b, 0))}</span>
                </span>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section
          title="توزیع فشار صف‌ها"
          description={`${data.queues.length} صف فعال — heatmap زنده`}
          actions={
            <span className={s.cardMeta}>
              {data.metrics.failed24h > 0 ? (
                <>
                  <AlertTriangle size={12} aria-hidden />
                  فشار بالا
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} aria-hidden />
                  پایدار
                </>
              )}
            </span>
          }
          icon={Activity}
        >
          <Card className={s.analyticsCard}>
            <Spotlight tone="emerald" />
            <GeometricAccent variant="dot" position="bottom-right" />
            <CardContent className={s.analyticsContent}>
              <QueueHeatmap items={heatmap} />
            </CardContent>
          </Card>
        </Section>
      </div>

      {/* Activity stream — Section کانونیکال + signature card */}
      <Section
        title="گزارش زنده"
        description="jobهای اخیر — هر رخداد، یک job."
        actions={
          <span className={s.liveTag}>
            <LiveDot tone="emerald" size="xs" />
            همین لحظه
          </span>
        }
        icon={Activity}
      >
        <Card className={s.signatureCard}>
          <Spotlight tone="emerald" />
          <GeometricAccent variant="vrule" position="top-left" />
          <CardContent className={s.activityContent}>
            <ActivityStream items={activityItems} maxHeight={300} />
          </CardContent>
        </Card>
      </Section>

      {/* Job list — Section کانونیکال + search shadcn + filter pills */}
      <Section
        title="صف اجرا"
        description="jobها بر اساس وضعیت — اولویت با خطاها."
        actions={
          <div className={s.sectionHeadRight}>
            <div className={s.searchWrap}>
              <Search size={14} aria-hidden className={s.searchIcon} />
              <Input
                type="search"
                className={s.search}
                placeholder="جستجو در نوع یا شناسه…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="جستجو"
              />
            </div>
            <FilterPills
              items={queueFilters}
              active={queue}
              onChange={setQueue}
              ariaLabel="فیلتر صف"
            />
          </div>
        }
        icon={Activity}
      >
        {filtered.length === 0 ? (
          <EmptyState
            title="Job‌ای یافت نشد"
            description="فیلتر یا جستجوی خود را تغییر دهید."
            icon={Activity}
          />
        ) : (
          <ul className={s.jobList}>
            {filtered.slice(0, 30).map((j) => (
              <li key={j.id} className={s.jobItem} data-status={j.status}>
                <div className={s.jobIcon}>
                  {j.status === 'running' ? (
                    <Loader2 size={14} className={s.spin} aria-hidden />
                  ) : j.status === 'completed' ? (
                    <CheckCircle2 size={14} aria-hidden />
                  ) : j.status === 'failed' || j.status === 'dead' ? (
                    <XCircle size={14} aria-hidden />
                  ) : j.status === 'pending' ? (
                    <Pause size={14} aria-hidden />
                  ) : (
                    <Activity size={14} aria-hidden />
                  )}
                </div>
                <div className={s.jobBody}>
                  <div className={s.jobTitle}>{j.type}</div>
                  <div className={s.jobMeta}>
                    <span className={s.jobQueue}>{j.queue}</span>
                    <span className={s.jobId}>{j.id.slice(0, 8)}</span>
                    {j.triggeredBy ? <span>{j.triggeredBy}</span> : null}
                    {j.attempts > 1 ? (
                      <span className={s.attempts}>تلاش {fmtPersian(j.attempts)}/{fmtPersian(j.maxAttempts)}</span>
                    ) : null}
                  </div>
                  {j.errorMessage ? (
                    <div className={s.jobError} title={j.errorMessage}>
                      {j.errorMessage.slice(0, 80)}
                      {j.errorMessage.length > 80 ? '…' : ''}
                    </div>
                  ) : null}
                </div>
                <div className={s.jobRight}>
                  <span className={s.statusPill} data-tone={STATUS_TONE[j.status]}>
                    {STATUS_LABELS[j.status]}
                  </span>
                  <span className={s.jobTime}>
                    {j.completedAt
                      ? formatRelative(j.completedAt)
                      : j.startedAt
                        ? formatRelative(j.startedAt)
                        : j.failedAt
                          ? formatRelative(j.failedAt)
                          : formatRelative(j.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {filtered.length > 30 ? (
          <div className={s.seeMore}>
            <Link href="/dashboard/jobs/queues" className={s.seeMoreLink}>
              مشاهده همه ({fmtPersian(filtered.length)})
            </Link>
          </div>
        ) : null}
      </Section>
    </HubShell>
  );
}
