'use client';

import {
  Activity,
  AlertTriangle,
  ArrowUp,
  Cpu,
  Database,
  Gauge,
  Globe,
  HardDrive,
  Inbox,
  Mail,
  Phone,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  TrendingUp,
  Wifi,
  Zap,
} from 'lucide-react';
import {
  type KeyboardEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import CountUp from '@/components/Dashboard/primitives/CountUp';
import { Spotlight } from '@/components/Dashboard/primitives/Spotlight';
import type {
  ErrorEvent,
  ObservabilitySnapshot,
  PerformanceSnapshot,
  ServiceHealth,
  ServiceKey,
  SlowQuery,
} from '@/lib/observability';
import s from './ObservabilityHub.module.css';

interface Props {
  initialData?: ObservabilitySnapshot;
}

type Tab = 'overview' | 'errors' | 'performance' | 'slow';

const TABS: { id: Tab; label: string; icon: ReactElement }[] = [
  { id: 'overview', label: 'نمای کلی', icon: <Radio className="h-4 w-4" /> },
  { id: 'errors', label: 'جریان خطا', icon: <AlertTriangle className="h-4 w-4" /> },
  { id: 'performance', label: 'کارایی', icon: <Gauge className="h-4 w-4" /> },
  { id: 'slow', label: 'کوئری‌های کند', icon: <Database className="h-4 w-4" /> },
];

const SERVICE_ICON: Record<ServiceKey, ReactElement> = {
  api: <Globe className="h-4 w-4" />,
  db: <Database className="h-4 w-4" />,
  cache: <HardDrive className="h-4 w-4" />,
  queue: <Zap className="h-4 w-4" />,
  auth: <Shield className="h-4 w-4" />,
  edge: <Wifi className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  sms: <Phone className="h-4 w-4" />,
  storage: <Inbox className="h-4 w-4" />,
};

const STATUS_LABEL: Record<string, string> = {
  healthy: 'سالم',
  degraded: 'کند',
  down: 'قطع',
  idle: 'بیکار',
  unknown: 'نامشخص',
};

const LEVEL_LABEL: Record<string, string> = {
  info: 'اطلاع',
  warn: 'هشدار',
  error: 'خطا',
  fatal: 'بحرانی',
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)} ثانیه پیش`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} دقیقه پیش`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ساعت پیش`;
  return `${Math.floor(diff / 86_400_000)} روز پیش`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${formatNumber(Math.round(ms))} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${formatNumber(h)} ساعت و ${formatNumber(m)} دقیقه`;
}

/* ────────────────────── Sub-components ────────────────────── */

function ServiceRadar({ services }: { services: ServiceHealth[] }) {
  const cx = 200;
  const cy = 200;
  const radius = 160;
  const angles = useMemo(
    () => services.map((_, i) => (i / services.length) * Math.PI * 2 - Math.PI / 2),
    [services],
  );

  return (
    <div className={s.radarWrap} aria-label="نمای رادار سرویس‌ها">
      <svg viewBox="0 0 400 400" className={s.radarSvg}>
        <defs>
          <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="60%" stopColor="currentColor" stopOpacity="0.05" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="radar-sweep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx={cx} cy={cy} r="200" fill="url(#radar-glow)" />

        {/* Concentric rings */}
        {[40, 80, 120, 160].map((r) => (
          <circle
            key={r}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="2 4"
            opacity="0.18"
          />
        ))}

        {/* Cross axes */}
        <line
          x1={cx - 180}
          y1={cy}
          x2={cx + 180}
          y2={cy}
          stroke="currentColor"
          strokeWidth="0.4"
          opacity="0.15"
        />
        <line
          x1={cx}
          y1={cy - 180}
          x2={cx}
          y2={cy + 180}
          stroke="currentColor"
          strokeWidth="0.4"
          opacity="0.15"
        />

        {/* Rotating sweep */}
        <g className={s.radarSweep} style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <path
            d={`M ${cx} ${cy} L ${cx + radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx} ${cy + radius} Z`}
            fill="url(#radar-sweep)"
          />
        </g>

        {/* Service blips */}
        {services.map((svc, i) => {
          const angle = angles[i] ?? 0;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const tone =
            svc.status === 'healthy'
              ? 'emerald'
              : svc.status === 'degraded'
                ? 'amber'
                : svc.status === 'down'
                  ? 'rose'
                  : 'neutral';
          const fill = `var(--ds-accent-${tone === 'neutral' ? 'slate' : tone})`;

          return (
            <g
              key={svc.id}
              className={s.blip}
              style={{ color: `var(--ds-accent-${tone === 'neutral' ? 'slate' : tone})` }}
            >
              <circle
                cx={x}
                cy={y}
                r="14"
                fill="none"
                stroke={fill}
                strokeWidth="1"
                opacity="0.4"
                className={s.blipPulse}
              />
              <circle cx={x} cy={y} r="6" fill={fill} opacity="0.95" />
              <text
                x={x}
                y={y - 22}
                textAnchor="middle"
                className={s.blipLabel}
                fill={fill}
                opacity="0.95"
              >
                {svc.name}
              </text>
              <text
                x={x}
                y={y - 10}
                textAnchor="middle"
                className={s.blipMeta}
                fill={fill}
                opacity="0.7"
              >
                {formatMs(svc.latencyMs)}
              </text>
            </g>
          );
        })}

        {/* Center mark */}
        <circle cx={cx} cy={cy} r="3" fill="currentColor" />
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          className={s.blipLabel}
          fill="currentColor"
          opacity="0.6"
        >
          مرکز
        </text>
      </svg>
    </div>
  );
}

function ServiceList({ services }: { services: ServiceHealth[] }) {
  return (
    <ul className={s.serviceList}>
      {services.map((svc) => {
        const tone =
          svc.status === 'healthy'
            ? 'emerald'
            : svc.status === 'degraded'
              ? 'amber'
              : svc.status === 'down'
                ? 'rose'
                : 'neutral';
        return (
          <li key={svc.id} className={s.serviceRow} data-tone={tone}>
            <span className={s.serviceIcon}>{SERVICE_ICON[svc.id]}</span>
            <div className={s.serviceMeta}>
              <div className={s.serviceName}>{svc.name}</div>
              <div className={s.serviceDesc}>{svc.desc}</div>
            </div>
            <svg className={s.serviceSpark} viewBox="0 0 80 24" aria-hidden>
              {(() => {
                const max = Math.max(...svc.sparkline, 1);
                const step = 80 / (svc.sparkline.length - 1);
                const points = svc.sparkline
                  .map((v, i) => {
                    const x = i * step;
                    const y = 22 - (v / max) * 18;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ');
                return (
                  <polyline
                    points={points}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                );
              })()}
            </svg>
            <div className={s.serviceNumbers}>
              <span className={s.serviceLatency}>{formatMs(svc.latencyMs)}</span>
              <span className={s.serviceUptime}>{svc.uptime24h.toFixed(2)}٪ uptime</span>
            </div>
            <span className={s.serviceStatus} data-tone={tone}>
              {STATUS_LABEL[svc.status] ?? svc.status}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function TideChart({ hours, errors }: { hours: number[]; errors: number[] }) {
  const max = Math.max(...hours, 1);
  const w = 600;
  const h = 140;
  const stepX = w / (hours.length - 1);

  const buildPath = (vals: number[]): string => {
    if (vals.length === 0) return '';
    return vals
      .map((v, i) => {
        const x = i * stepX;
        const y = h - (v / max) * (h - 10) - 4;
        if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        const prevX = (i - 1) * stepX;
        const prevY = h - ((vals[i - 1] ?? 0) / max) * (h - 10) - 4;
        const cx1 = prevX + stepX / 2;
        const cx2 = x - stepX / 2;
        return `C ${cx1.toFixed(1)} ${prevY.toFixed(1)}, ${cx2.toFixed(1)} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const buildArea = (vals: number[]): string => {
    const linePath = buildPath(vals);
    if (!linePath) return '';
    return `${linePath} L ${w.toFixed(1)} ${h} L 0 ${h} Z`;
  };

  return (
    <div className={s.tideWrap}>
      <div className={s.tideHeader}>
        <span className={s.tideLabel}>جریان رویداد ۲۴ ساعت</span>
        <span className={s.tideLegend}>
          <span className={s.tideDot} data-tone="cyan" /> کل
          <span className={s.tideDot} data-tone="rose" /> خطا
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className={s.tideSvg} preserveAspectRatio="none">
        <defs>
          <linearGradient id="tide-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ds-accent-cyan)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--ds-accent-cyan)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tide-area-err" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ds-accent-rose)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--ds-accent-rose)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1="0"
            y1={h * p}
            x2={w}
            y2={h * p}
            stroke="currentColor"
            strokeWidth="0.4"
            strokeDasharray="2 6"
            opacity="0.15"
          />
        ))}
        <path d={buildArea(hours)} fill="url(#tide-area)" />
        <path d={buildPath(hours)} fill="none" stroke="var(--ds-accent-cyan)" strokeWidth="1.5" />
        <path d={buildArea(errors)} fill="url(#tide-area-err)" />
        <path
          d={buildPath(errors)}
          fill="none"
          stroke="var(--ds-accent-rose)"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />
      </svg>
      <div className={s.tideAxis}>
        <span>۲۴ ساعت پیش</span>
        <span>۱۲ ساعت پیش</span>
        <span>الان</span>
      </div>
    </div>
  );
}

function PerformancePanel({ perf }: { perf: PerformanceSnapshot }) {
  return (
    <div className={s.perfGrid}>
      <div className={s.perfCard}>
        <div className={s.perfLabel}>p50</div>
        <div className={s.perfValue}>
          <CountUp value={perf.p50} />
          <span className={s.perfUnit}> ms</span>
        </div>
        <div className={s.perfSub}>زمان پاسخ میانه</div>
      </div>
      <div className={s.perfCard}>
        <div className={s.perfLabel}>p95</div>
        <div className={s.perfValue}>
          <CountUp value={perf.p95} />
          <span className={s.perfUnit}> ms</span>
        </div>
        <div className={s.perfSub}>صدک ۹۵</div>
      </div>
      <div className={s.perfCard}>
        <div className={s.perfLabel}>p99</div>
        <div className={s.perfValue}>
          <CountUp value={perf.p99} />
          <span className={s.perfUnit}> ms</span>
        </div>
        <div className={s.perfSub}>صدک ۹۹</div>
      </div>
      <div className={s.perfCard} data-tone="rose">
        <div className={s.perfLabel}>نرخ خطا</div>
        <div className={s.perfValue}>
          <CountUp value={perf.errorRate} decimals={2} />
          <span className={s.perfUnit}>٪</span>
        </div>
        <div className={s.perfSub}>۱ ساعت گذشته</div>
      </div>
      <div className={s.perfCard}>
        <div className={s.perfLabel}>حجم لاگ</div>
        <div className={s.perfValue}>
          <CountUp value={perf.logsPerHour} />
        </div>
        <div className={s.perfSub}>در ساعت</div>
      </div>
      <div className={s.perfCard}>
        <div className={s.perfLabel}>حافظه Heap</div>
        <div className={s.perfValue}>
          <CountUp value={perf.memoryMb} />
          <span className={s.perfUnit}> MB</span>
        </div>
        <div className={s.perfSub}>استفاده فعلی</div>
      </div>
      <div className={s.perfCard}>
        <div className={s.perfLabel}>Uptime</div>
        <div className={s.perfValue}>{formatUptime(perf.uptimeSec)}</div>
        <div className={s.perfSub}>از آخرین راه‌اندازی</div>
      </div>
      <div className={s.perfCard}>
        <div className={s.perfLabel}>پایداری</div>
        <div className={s.perfValue}>
          <span className={s.perfIndicator} data-tone="emerald">
            <TrendingUp className="h-4 w-4" />
            پایدار
          </span>
        </div>
        <div className={s.perfSub}>بدون incident بحرانی</div>
      </div>
    </div>
  );
}

function ErrorStream({ errors }: { errors: ErrorEvent[] }) {
  if (errors.length === 0) {
    return (
      <div className={s.errorEmpty}>
        <ShieldCheck className="h-8 w-8" />
        <p>هیچ خطایی در ۲۴ ساعت گذشته ثبت نشده است.</p>
      </div>
    );
  }
  return (
    <ol className={s.errorList}>
      {errors.slice(0, 25).map((err) => (
        <li key={err.id} className={s.errorRow} data-level={err.level}>
          <span className={s.errorLevel} data-level={err.level}>
            {LEVEL_LABEL[err.level] ?? err.level}
          </span>
          <span className={s.errorSource}>{err.source}</span>
          <span className={s.errorMessage}>{err.message}</span>
          {err.count > 1 ? <span className={s.errorCount}>×{formatNumber(err.count)}</span> : null}
          <span className={s.errorTime}>{formatTimeAgo(err.timestamp)}</span>
        </li>
      ))}
    </ol>
  );
}

function SlowQueriesTable({ queries }: { queries: SlowQuery[] }) {
  if (queries.length === 0) {
    return (
      <div className={s.errorEmpty}>
        <Activity className="h-8 w-8" />
        <p>کوئری کند ثبت نشده است. لاگ‌هایی با برچسب [perf] یا [slow] اینجا نمایش داده می‌شوند.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
    <table className={s.slowTable}>
      <thead>
        <tr>
          <th>سرویس</th>
          <th>مدت</th>
          <th>پیام</th>
          <th>زمان</th>
        </tr>
      </thead>
      <tbody>
        {queries.map((q) => (
          <tr key={q.id}>
            <td>
              <span className={s.slowSource}>{q.source}</span>
            </td>
            <td>
              <span className={s.slowDuration}>{formatMs(q.durationMs)}</span>
            </td>
            <td className={s.slowMessage}>{q.message}</td>
            <td className={s.slowTime}>{formatTimeAgo(q.timestamp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

/* ────────────────────── Main component ────────────────────── */

export function ObservabilityHub({ initialData }: Props) {
  const [data, setData] = useState<ObservabilitySnapshot | undefined>(initialData);
  const [tab, setTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch] = useState<string>(
    initialData?.generatedAt ?? new Date().toISOString(),
  );
  // نگه‌دارنده برای re-render هر ثانیه (تا "X پیش" به‌روز بماند)
  const [, setNow] = useState<number>(Date.now());
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    overview: null,
    errors: null,
    performance: null,
    slow: null,
  });
  const tabsId = useId();

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/observability/metrics', { cache: 'no-store' });
      const json = (await res.json()) as { success: boolean; data?: ObservabilitySnapshot };
      if (json.success && json.data) {
        setData(json.data);
        setLastFetch(json.data.generatedAt);
      }
    } catch {
      /* silent */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    // tick هر ۳۰ ثانیه برای "X پیش" — هر ثانیه re-render کل hub غیرضروری است
    const tick = setInterval(() => setNow(Date.now()), 30_000);

    const start = () => {
      if (id) return;
      id = setInterval(() => void fetchData(), 30_000);
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        void fetchData();
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchData]);

  // keyboard navigation برای tab list (R16-fix: قبلاً فقط click کار می‌کرد)
  const onTabKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const order: Tab[] = TABS.map((t) => t.id);
      const idx = order.indexOf(tab);
      if (idx < 0) return;
      let next: number | null = null;
      if (e.key === 'ArrowLeft') next = (idx + 1) % order.length;
      else if (e.key === 'ArrowRight') next = (idx - 1 + order.length) % order.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = order.length - 1;
      if (next !== null) {
        e.preventDefault();
        const newTab = order[next];
        if (newTab) {
          setTab(newTab);
          tabRefs.current[newTab]?.focus();
        }
      }
    },
    [tab],
  );

  const summary = useMemo(() => {
    const services = data?.services ?? [];
    const healthy = services.filter((svc) => svc.status === 'healthy').length;
    const degraded = services.filter((svc) => svc.status === 'degraded').length;
    const down = services.filter((svc) => svc.status === 'down').length;
    const errCount = (data?.errors ?? []).reduce((sum, err) => sum + err.count, 0);
    return { total: services.length, healthy, degraded, down, errCount };
  }, [data]);

  if (!data) {
    return (
      <div className={s.empty}>
        <Radio className="h-10 w-10" />
        <p>داده‌ای برای نمایش وجود ندارد. سیستم در حال جمع‌آوری است.</p>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <Spotlight tone="cyan" />

      {/* ── Summary strip ─────────────────────────────────────────────── */}
      <section className={s.summary}>
        <div className={s.summaryCard} data-tone="emerald">
          <div className={s.summaryLabel}>سرویس‌های سالم</div>
          <div className={s.summaryValue}>
            <CountUp value={summary.healthy} /> / {summary.total}
          </div>
          <ArrowUp className={s.summaryArrow} />
        </div>
        <div className={s.summaryCard} data-tone="amber">
          <div className={s.summaryLabel}>سرویس‌های کند</div>
          <div className={s.summaryValue}>
            <CountUp value={summary.degraded} />
          </div>
          <Activity className={s.summaryArrow} />
        </div>
        <div className={s.summaryCard} data-tone="rose">
          <div className={s.summaryLabel}>سرویس‌های قطع</div>
          <div className={s.summaryValue}>
            <CountUp value={summary.down} />
          </div>
          <AlertTriangle className={s.summaryArrow} />
        </div>
        <div className={s.summaryCard} data-tone="rose">
          <div className={s.summaryLabel}>خطا در ۲۴ ساعت</div>
          <div className={s.summaryValue}>
            <CountUp value={summary.errCount} />
          </div>
          <AlertTriangle className={s.summaryArrow} />
        </div>
        <div className={s.summaryCard} data-tone="cyan">
          <div className={s.summaryLabel}>p95 latency</div>
          <div className={s.summaryValue}>
            <CountUp value={data.performance.p95} />
            <span className={s.summaryUnit}> ms</span>
          </div>
          <Gauge className={s.summaryArrow} />
        </div>
        <div className={s.summaryCard} data-tone="indigo">
          <div className={s.summaryLabel}>Uptime process</div>
          <div className={s.summaryValue}>{formatUptime(data.performance.uptimeSec)}</div>
          <Cpu className={s.summaryArrow} />
        </div>
      </section>

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <div className={s.tabBar}>
        <div
          className={s.tabs}
          role="tablist"
          aria-label="بخش‌های observability"
          aria-orientation="horizontal"
          onKeyDown={onTabKeyDown}
        >
          {TABS.map((t) => {
            const tabId = `${tabsId}-tab-${t.id}`;
            const panelId = `${tabsId}-panel-${t.id}`;
            return (
              <button
                key={t.id}
                id={tabId}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={panelId}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={s.tab}
                data-active={tab === t.id}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className={s.tabBarMeta}>
          <span className={s.lastFetch} aria-live="polite">
            آخرین به‌روزرسانی: {formatTimeAgo(lastFetch)}
          </span>
          <button
            type="button"
            onClick={() => void fetchData()}
            className={s.refreshBtn}
            disabled={refreshing}
            aria-label="به‌روزرسانی"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? s.spin : ''}`} aria-hidden />
          </button>
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div
          id={`${tabsId}-panel-overview`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-tab-overview`}
          className={s.overviewGrid}
        >
          <section className={s.radarCard}>
            <header className={s.cardHeader}>
              <h2>
                <Radio className="h-4 w-4" /> رادار سرویس‌ها
              </h2>
              <p>نمای زنده از ۹ سرویس اصلی — هر ۳۰ ثانیه به‌روز می‌شود</p>
            </header>
            <ServiceRadar services={data.services} />
          </section>

          <section className={s.tideCard}>
            <header className={s.cardHeader}>
              <h2>
                <Activity className="h-4 w-4" /> جریان رویداد
              </h2>
              <p>حجم لاگ و خطا در ۲۴ ساعت گذشته</p>
            </header>
            <TideChart hours={data.hourly} errors={data.hourlyErrors} />
          </section>

          <section className={s.serviceListCard}>
            <header className={s.cardHeader}>
              <h2>
                <Server className="h-4 w-4" /> جزئیات سرویس‌ها
              </h2>
              <p>latency، uptime و sparkline هر سرویس</p>
            </header>
            <ServiceList services={data.services} />
          </section>
        </div>
      )}

      {tab === 'errors' && (
        <section
          id={`${tabsId}-panel-errors`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-tab-errors`}
          className={s.errorsCard}
        >
          <header className={s.cardHeader}>
            <h2>
              <AlertTriangle className="h-4 w-4" /> جریان خطا — ۲۴ ساعت گذشته
            </h2>
            <p>{formatNumber(data.errors.length)} رویداد خطا (با حذف تکراری)</p>
          </header>
          <ErrorStream errors={data.errors} />
        </section>
      )}

      {tab === 'performance' && (
        <section
          id={`${tabsId}-panel-performance`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-tab-performance`}
          className={s.perfCard}
        >
          <header className={s.cardHeader}>
            <h2>
              <Gauge className="h-4 w-4" /> کارایی سیستم
            </h2>
            <p>شاخص‌های کلیدی latency، خطا و حافظه</p>
          </header>
          <PerformancePanel perf={data.performance} />
        </section>
      )}

      {tab === 'slow' && (
        <section
          id={`${tabsId}-panel-slow`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-tab-slow`}
          className={s.slowCard}
        >
          <header className={s.cardHeader}>
            <h2>
              <Database className="h-4 w-4" /> کوئری‌های کند — ۶ ساعت گذشته
            </h2>
            <p>لاگ‌هایی با برچسب [perf]، [slow] یا duration=ms</p>
          </header>
          <SlowQueriesTable queries={data.slowQueries} />
        </section>
      )}
    </div>
  );
}
