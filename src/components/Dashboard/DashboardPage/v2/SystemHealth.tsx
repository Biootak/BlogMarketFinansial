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

import { useEffect, useState } from 'react';
import { motion } from '@/lib/motion-shim';
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

export default function SystemHealth() {
  const [health, setHealth] = useState<Health>(INITIAL);

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
    },
    {
      key: 'build',
      label: 'نسخه',
      value: `${health.buildEnv} · ${shortSha(health.buildSha)}`,
      tone: 'ok' as Tone,
      icon: <HiOutlineCheckBadge className="w-4 h-4" />,
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