'use client';

/**
 * SystemHealth — operational snapshot rail (2026-06-26 redesign).
 *
 * Surfaces three signals, all read live from `/api/health/dashboard`:
 *   • Database connectivity (probed via `SELECT 1`)
 *   • Bazaar cron last-sync (most recent ExchangeRate.updatedAt)
 *   • Build / version stamp (NODE_ENV + git SHA + DB latency)
 *
 * 2026-06-26 fix: the previous implementation generated fake "latency
 * history" via a seeded LCG random number generator — misleading on a
 * production dashboard. Replaced with a real polling approach: the
 * component polls /api/health/dashboard every 30s, accumulates up to 12
 * real latency samples, and renders a sparkline from actual data. On
 * first load (before enough samples exist), the sparkline shows a
 * skeleton bar instead of fabricated numbers.
 *
 * The fetch is best-effort and degrades gracefully: any network failure
 * flips the indicator to a "fail" tone but the component keeps rendering
 * the rest of the rail.
 */

import { motion, useReducedMotion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineCheckBadge,
  HiOutlineExclamationTriangle,
  HiOutlineServerStack,
} from 'react-icons/hi2';

type Tone = 'ok' | 'fail' | 'pending' | 'stale' | 'unknown';

interface Health {
  db: Tone;
  bazaar: Tone;
  bazaarAt: string | null;
  bazaarAgeMs: number | null;
  buildEnv: string;
  buildSha: string | null;
  buildVersion: string;
  dbLatencyMs: number;
  serverTime: string;
}

const INITIAL: Health = {
  db: 'pending',
  bazaar: 'pending',
  bazaarAt: null,
  bazaarAgeMs: null,
  buildEnv: '...',
  buildSha: null,
  buildVersion: '...',
  dbLatencyMs: 0,
  serverTime: '',
};

const MAX_SAMPLES = 12;
const POLL_INTERVAL_MS = 120_000; // ۲ دقیقه (قبلاً ۳۰ ثانیه بود)
const SPARKLINE_BARS = MAX_SAMPLES;
const SPARKLINE_GROW_MS = 400;
const SPARKLINE_STAGGER_MS = 30;
const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
const COLOR_EMERALD = 'oklch(72% 0.14 165)';
const COLOR_ROSE = 'oklch(65% 0.18 25)';

function formatRelativeFa(ms: number | null): string {
  if (ms == null) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s.toLocaleString('fa-IR')} ثانیه پیش`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m.toLocaleString('fa-IR')} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h.toLocaleString('fa-IR')} ساعت پیش`;
  const d = Math.floor(h / 24);
  return `${d.toLocaleString('fa-IR')} روز پیش`;
}

function shortSha(sha: string | null): string {
  if (!sha) return '—';
  return sha.length > 7 ? `…${sha.slice(-7)}` : sha;
}

interface MiniSparklineProps {
  data: number[];
  prefersReducedMotion: boolean;
}

function MiniSparkline({ data, prefersReducedMotion }: MiniSparklineProps) {
  const max = Math.max(...data, 1);
  const maxIndex = data.indexOf(max);
  const styleId = useId();

  // Pad with zeros if we don't have enough samples yet — the skeleton bars
  // are rendered at height 0 so they're invisible, keeping the layout stable.
  const padded = useMemo(() => {
    const arr = [...data];
    while (arr.length < SPARKLINE_BARS) arr.push(0);
    return arr.slice(-SPARKLINE_BARS);
  }, [data]);

  const bars = useMemo(() => {
    return padded.map((value, index) => {
      const height = (value / max) * 24;
      const x = index * 1;
      const isHighest = index === maxIndex && value > 0;
      const delay = index * SPARKLINE_STAGGER_MS;
      return {
        key: `${styleId}-bar-${index}`,
        x,
        y: 24 - height,
        width: 0.8,
        height,
        fill: isHighest ? COLOR_ROSE : COLOR_EMERALD,
        delay,
      };
    });
  }, [padded, max, maxIndex, styleId]);

  const keyframes = `
    @keyframes sparkline-grow-${styleId} {
      from { transform: scaleY(0); }
      to { transform: scaleY(1); }
    }
  `;

  return (
    <svg viewBox={`0 0 ${SPARKLINE_BARS} 24`} className="w-4 h-6 shrink-0" role="img" aria-hidden>
      <title>نمودار تأخیر</title>
      {!prefersReducedMotion && <style>{keyframes}</style>}
      {bars.map((bar) => (
        <rect
          key={bar.key}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
          rx={0.2}
          fill={bar.fill}
          style={{
            transformBox: 'fill-box',
            transformOrigin: 'bottom',
            animation: prefersReducedMotion
              ? 'none'
              : `sparkline-grow-${styleId} ${SPARKLINE_GROW_MS}ms ${EASE_OUT_EXPO} ${bar.delay}ms backwards`,
          }}
        />
      ))}
    </svg>
  );
}

export default function SystemHealth() {
  const [health, setHealth] = useState<Health>(INITIAL);
  const prefersReducedMotion = useReducedMotion();

  // Real latency history — accumulated from polling, NOT from a random
  // generator. Capped at MAX_SAMPLES; oldest samples drop off.
  const dbHistoryRef = useRef<number[]>([]);
  const bazaarHistoryRef = useRef<number[]>([]);
  const [dbHistory, setDbHistory] = useState<number[]>([]);
  const [bazaarHistory, setBazaarHistory] = useState<number[]>([]);

  useEffect(() => {
    let aborted = false;

    const apply = (raw: Partial<Health>) => {
      if (aborted) return;
      setHealth((prev) => ({ ...prev, ...raw }));
    };

    const poll = async () => {
      try {
        const res = await fetch('/api/health/dashboard', {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json().catch(() => null)) as
          | (Partial<Health> & {
              ok?: boolean;
              db?: 'ok' | 'fail';
              bazaar?: 'ok' | 'stale' | 'unknown' | 'fail';
              build?: { env?: string; sha?: string | null; version?: string };
            })
          | null;
        if (aborted || !json) return;

        const dbLatency = json.dbLatencyMs ?? 0;
        const bazaarAge = json.bazaarAgeMs ?? 0;

        // Push real samples into the history buffers.
        if (json.db) {
          dbHistoryRef.current = [...dbHistoryRef.current, Math.max(0, dbLatency)].slice(
            -MAX_SAMPLES,
          );
          setDbHistory([...dbHistoryRef.current]);
        }
        if (json.bazaar) {
          bazaarHistoryRef.current = [...bazaarHistoryRef.current, Math.max(0, bazaarAge)].slice(
            -MAX_SAMPLES,
          );
          setBazaarHistory([...bazaarHistoryRef.current]);
        }

        apply({
          db: json.db ?? 'fail',
          bazaar: json.bazaar ?? 'unknown',
          bazaarAt: json.bazaarAt ?? null,
          bazaarAgeMs: json.bazaarAgeMs ?? null,
          buildEnv: json.build?.env ?? 'production',
          buildSha: json.build?.sha ?? null,
          buildVersion: json.build?.version ?? '0.0.0',
          dbLatencyMs: dbLatency,
          serverTime: json.serverTime ?? new Date().toISOString(),
        });
      } catch {
        if (!aborted) apply({ db: 'fail', bazaar: 'fail' });
      }
    };

    // Initial poll immediately, then every POLL_INTERVAL_MS.
    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);

    // 2026-06-26: وقتی tab dashboard فعال نیست (کاربر روی tab دیگه‌ست)،
    // polling را متوقف کن تا بار اضافی روی سرور نیاد. وقتی کاربر برگرده،
    // یک poll فوری + interval مجدد شروع می‌شه.
    const onVisibilityChange = () => {
      if (document.hidden) {
        window.clearInterval(interval);
      } else {
        poll();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      aborted = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const rows = [
    {
      key: 'db',
      label: 'پایگاه‌داده',
      value:
        health.db === 'ok'
          ? `پایدار · ${health.dbLatencyMs.toLocaleString('fa-IR')}ms`
          : health.db === 'fail'
            ? 'قطع'
            : 'در حال بررسی',
      tone: health.db,
      icon: <HiOutlineServerStack className="w-4 h-4" />,
      history: dbHistory,
    },
    {
      key: 'bazaar',
      label: 'کرون نرخ بازار',
      value:
        health.bazaar === 'ok'
          ? `فعال · ${formatRelativeFa(health.bazaarAgeMs)}`
          : health.bazaar === 'stale'
            ? `قدیمی · ${formatRelativeFa(health.bazaarAgeMs)}`
            : health.bazaar === 'unknown'
              ? 'هنوز اجرا نشده'
              : health.bazaar === 'fail'
                ? 'خطا'
                : 'در حال بررسی',
      tone: health.bazaar,
      icon: <HiOutlineArrowPath className="w-4 h-4" />,
      history: bazaarHistory,
    },
    {
      key: 'build',
      label: 'نسخه',
      value: `${health.buildEnv} · ${shortSha(health.buildSha)}`,
      tone: 'ok' as Tone,
      icon: <HiOutlineCheckBadge className="w-4 h-4" />,
      history: [] as number[],
    },
  ] as const;

  const overallTone: Tone =
    health.db === 'fail' || health.bazaar === 'fail'
      ? 'fail'
      : health.db === 'pending' || health.bazaar === 'pending'
        ? 'pending'
        : health.bazaar === 'stale'
          ? 'stale'
          : 'ok';

  const overallLabel =
    overallTone === 'ok'
      ? 'همه چیز عادی'
      : overallTone === 'stale'
        ? 'نرخ بازار قدیمی است'
        : overallTone === 'fail'
          ? 'نیاز به بررسی'
          : 'در حال بررسی';

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="dash-pane dash-pane--tall"
      aria-label="سلامت سیستم"
    >
      <header className="dash-pane__head">
        <span className="dash-pane__title">
          <span className="dash-ico dash-ico--amber w-10 h-10 shrink-0" aria-hidden>
            <HiOutlineServerStack className="w-5 h-5" />
          </span>
          <span className="dash-pane__title-text">سلامت سیستم</span>
        </span>
        <span
          className="dash-status"
          data-tone={overallTone === 'ok' ? 'ok' : overallTone === 'fail' ? 'fail' : 'muted'}
          aria-live="polite"
        >
          <span
            className={cn(
              'dash-status-dot',
              overallTone === 'ok'
                ? '[background:oklch(58%_0.13_162)]'
                : overallTone === 'stale'
                  ? '[background:oklch(70%_0.13_75)]'
                  : overallTone === 'fail'
                    ? '[background:oklch(60%_0.18_25)]'
                    : 'animate-pulse',
            )}
          />
          {overallLabel}
        </span>
      </header>

      <ul className="grid gap-1.5">
        {rows.map((row) => {
          const rowTone: Tone = row.tone;
          return (
            <li
              key={row.key}
              className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 bg-white/75 dark:bg-[#1e293b]/50 border-[0.5px] border-white/90 dark:border-slate-600/20"
            >
              <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 min-w-0">
                <span
                  className="dash-kpi-ico w-7 h-7"
                  data-tone={
                    rowTone === 'ok'
                      ? 'ok'
                      : rowTone === 'fail'
                        ? 'fail'
                        : rowTone === 'stale'
                          ? 'warn'
                          : 'neutral'
                  }
                  aria-hidden
                >
                  {row.icon}
                </span>
                <span className="truncate">{row.label}</span>
              </span>
              <span className="flex items-center gap-2 ms-auto">
                {row.history.length > 0 && (
                  <MiniSparkline data={row.history} prefersReducedMotion={prefersReducedMotion} />
                )}
                <span
                  className={cn(
                    'text-xs font-semibold tabular-nums shrink-0 text-end',
                    'text-slate-700/80 dark:text-slate-300/85',
                    rowTone === 'fail' && 'text-slate-900 dark:text-white font-bold',
                    rowTone === 'ok' && 'font-bold',
                  )}
                >
                  {row.value}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {health.db === 'fail' && (
        <p className="flex items-center gap-1.5 dash-meta mt-1">
          <HiOutlineExclamationTriangle className="w-3.5 h-3.5" aria-hidden />
          <span>اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید.</span>
        </p>
      )}
      {health.bazaar === 'stale' && health.db === 'ok' && (
        <p className="flex items-center gap-1.5 dash-meta mt-1">
          <HiOutlineExclamationTriangle className="w-3.5 h-3.5" aria-hidden />
          <span>کرون نرخ بازار بیش از ۳۰ دقیقه به‌روزرسانی نشده است.</span>
        </p>
      )}
    </motion.section>
  );
}
