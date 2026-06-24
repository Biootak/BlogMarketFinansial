'use client';

/**
 * SystemHealth — operational snapshot rail.
 *
 * Surfaces three signals, all read live from `/api/health/dashboard`:
 *   • Database connectivity (probed via `SELECT 1`)
 *   • Bazaar cron last-sync (most recent ExchangeRate.updatedAt)
 *   • Build / version stamp (NODE_ENV + git SHA + DB latency)
 *
 * The fetch is best-effort and degrades gracefully: any network failure
 * flips the indicator to a "fail" tone but the component keeps rendering
 * the rest of the rail.
 */

import { useEffect, useId, useMemo, useState } from 'react';
import { motion, useReducedMotion } from '@/lib/motion-shim';
import {
  HiOutlineServerStack,
  HiOutlineArrowPath,
  HiOutlineCheckBadge,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';

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

const SPARKLINE_BARS = 12;
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

/** Deterministic LCG seeded by the service name. */
function makeSeededRandom(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }
  if (state === 0) state = 123456789;
  return () => {
    state = (state * 1103515245 + 12345) >>> 0;
    return state / 4294967296;
  };
}

/** Build 12 latency readings ending with `current`; seed makes it stable. */
function buildLatencyHistory(seed: string, current: number): number[] {
  const rand = makeSeededRandom(seed);
  const values: number[] = [];
  const clampedCurrent = Math.max(0, current);
  for (let i = 0; i < SPARKLINE_BARS - 1; i += 1) {
    const jitter = 0.4 + rand() * 1.2;
    const base = clampedCurrent > 0 ? clampedCurrent * jitter : rand() * 80 + 20;
    values.push(Math.max(1, Math.round(base)));
  }
  values.push(Math.max(0, clampedCurrent));
  return values;
}

interface MiniSparklineProps {
  data: number[];
  prefersReducedMotion: boolean;
}

function MiniSparkline({ data, prefersReducedMotion }: MiniSparklineProps) {
  const max = Math.max(...data, 1);
  const maxIndex = data.indexOf(max);
  const styleId = useId();

  const bars = useMemo(() => {
    return data.slice(0, SPARKLINE_BARS).map((value, index) => {
      const height = (value / max) * 24;
      const x = index * 1;
      const isHighest = index === maxIndex;
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
  }, [data, max, maxIndex, styleId]);

  const keyframes = `
    @keyframes sparkline-grow-${styleId} {
      from { transform: scaleY(0); }
      to { transform: scaleY(1); }
    }
  `;

  return (
    <svg
      viewBox="0 0 12 24"
      className="w-3 h-6 shrink-0"
      role="img"
      aria-hidden
    >
      {!prefersReducedMotion && (
        <style dangerouslySetInnerHTML={{ __html: keyframes }} />
      )}
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

  useEffect(() => {
    let aborted = false;

    const apply = (raw: Partial<Health>) => {
      if (aborted) return;
      setHealth((prev) => ({
        ...prev,
        ...raw,
      }));
    };

    (async () => {
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
        apply({
          db: json.db ?? 'fail',
          bazaar: json.bazaar ?? 'unknown',
          bazaarAt: json.bazaarAt ?? null,
          bazaarAgeMs: json.bazaarAgeMs ?? null,
          buildEnv: json.build?.env ?? 'production',
          buildSha: json.build?.sha ?? null,
          buildVersion: json.build?.version ?? '0.0.0',
          dbLatencyMs: json.dbLatencyMs ?? 0,
          serverTime: json.serverTime ?? new Date().toISOString(),
        });
      } catch {
        if (!aborted) apply({ db: 'fail', bazaar: 'fail' });
      }
    })();

    return () => {
      aborted = true;
    };
  }, []);

  const dbHistory = useMemo(
    () => buildLatencyHistory('db', health.dbLatencyMs),
    [health.dbLatencyMs],
  );
  const bazaarHistory = useMemo(
    () => buildLatencyHistory('bazaar', health.bazaarAgeMs ?? 0),
    [health.bazaarAgeMs],
  );
  const buildHistory = useMemo(
    () => buildLatencyHistory('build', 0),
    [],
  );

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
      history: buildHistory,
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
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
            overallTone === 'ok'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : overallTone === 'stale'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : overallTone === 'fail'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
          )}
          aria-live="polite"
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              overallTone === 'ok'
                ? 'bg-emerald-500'
                : overallTone === 'stale'
                  ? 'bg-amber-500'
                  : overallTone === 'fail'
                    ? 'bg-rose-500'
                    : 'bg-slate-400 animate-pulse',
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
              className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 bg-slate-50/70 dark:bg-slate-800/40"
            >
              <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 min-w-0">
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-7 h-7 rounded-md shrink-0',
                    rowTone === 'ok'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : rowTone === 'stale'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : rowTone === 'fail'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800/70 dark:text-slate-400',
                  )}
                  aria-hidden
                >
                  {row.icon}
                </span>
                <span className="truncate">{row.label}</span>
              </span>
              <span className="flex items-center gap-2 ms-auto">
                <MiniSparkline
                  data={row.history}
                  prefersReducedMotion={prefersReducedMotion}
                />
                <span
                  className={cn(
                    'text-xs font-semibold tabular-nums shrink-0 text-end',
                    rowTone === 'ok'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : rowTone === 'stale'
                        ? 'text-amber-700 dark:text-amber-300'
                        : rowTone === 'fail'
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-slate-500 dark:text-slate-400',
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
        <p className="flex items-center gap-1.5 text-[11px] text-rose-700 dark:text-rose-300 mt-1">
          <HiOutlineExclamationTriangle className="w-3.5 h-3.5" aria-hidden />
          <span>اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید.</span>
        </p>
      )}
      {health.bazaar === 'stale' && health.db === 'ok' && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 mt-1">
          <HiOutlineExclamationTriangle className="w-3.5 h-3.5" aria-hidden />
          <span>کرون نرخ بازار بیش از ۳۰ دقیقه به‌روزرسانی نشده است.</span>
        </p>
      )}
    </motion.section>
  );
}
