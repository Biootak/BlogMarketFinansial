'use client';

/**
 * StatusFloor — TIDE 2026 (July 1) persistent bottom status strip.
 *
 * A footer-like ribbon that lives at the bottom of the dashboard with
 * five "stations":
 *
 *   [ build ]   [ server time ]   [ last bazaar sync ]   [ db latency ]   [ env ]
 *
 * The strip is informational, low-priority, and never demands attention.
 * It's the visual "ankle" of the dashboard — a reminder that everything
 * is alive and accounted for.
 *
 * Uses real data from /api/health/dashboard (same endpoint as SystemHealth)
 * so the user sees consistent numbers across the two surfaces. We poll
 * independently here so the floor updates even when the SystemHealth
 * card is off-screen (long pages).
 */

import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import {
  HiOutlineCircleStack,
  HiOutlineClock,
  HiOutlineCpuChip,
  HiOutlineGlobeAlt,
  HiOutlineServerStack,
} from 'react-icons/hi2';

type Tone = 'ok' | 'fail' | 'pending' | 'stale' | 'unknown';

interface FloorHealth {
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

const INITIAL: FloorHealth = {
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

const POLL_INTERVAL_MS = 60_000;

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
  return sha.length > 7 ? sha.slice(0, 7) : sha;
}

function formatTime(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '—';
  }
}

function ToneDot({ tone }: { tone: Tone }) {
  return <span className={cn('tide-floor__dot', `is-${tone}`)} aria-hidden />;
}

export default function StatusFloor() {
  const [health, setHealth] = useState<FloorHealth>(INITIAL);

  useEffect(() => {
    let aborted = false;

    const poll = async () => {
      try {
        const res = await fetch('/api/health/dashboard', {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json().catch(() => null)) as
          | (Partial<FloorHealth> & {
              ok?: boolean;
              db?: 'ok' | 'fail';
              bazaar?: 'ok' | 'stale' | 'unknown' | 'fail';
              build?: { env?: string; sha?: string | null; version?: string };
            })
          | null;
        if (aborted || !json) return;
        setHealth({
          db: (json.db as Tone) ?? 'fail',
          bazaar: (json.bazaar as Tone) ?? 'unknown',
          bazaarAt: json.bazaarAt ?? null,
          bazaarAgeMs: json.bazaarAgeMs ?? null,
          buildEnv: json.build?.env ?? 'production',
          buildSha: json.build?.sha ?? null,
          buildVersion: json.build?.version ?? '0.0.0',
          dbLatencyMs: json.dbLatencyMs ?? 0,
          serverTime: json.serverTime ?? new Date().toISOString(),
        });
      } catch {
        if (!aborted) setHealth((prev) => ({ ...prev, db: 'fail', bazaar: 'fail' }));
      }
    };

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      aborted = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <motion.footer
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="tide-floor"
      aria-label="وضعیت سیستم"
    >
      <div className="tide-floor__rail">
        <span className="tide-floor__station">
          <HiOutlineCpuChip className="w-3.5 h-3.5" aria-hidden />
          <span className="tide-floor__station-label">نسخه</span>
          <span className="tide-floor__station-value tabular-nums">{health.buildVersion}</span>
          <span className="tide-floor__station-meta">{shortSha(health.buildSha)}</span>
        </span>

        <span className="tide-floor__sep" aria-hidden />

        <span className="tide-floor__station">
          <HiOutlineGlobeAlt className="w-3.5 h-3.5" aria-hidden />
          <span className="tide-floor__station-label">محیط</span>
          <span className="tide-floor__station-value">{health.buildEnv}</span>
        </span>

        <span className="tide-floor__sep" aria-hidden />

        <span className="tide-floor__station">
          <HiOutlineServerStack className="w-3.5 h-3.5" aria-hidden />
          <span className="tide-floor__station-label">پایگاه‌داده</span>
          <ToneDot tone={health.db} />
          <span className="tide-floor__station-value tabular-nums">
            {health.db === 'ok'
              ? `${health.dbLatencyMs.toLocaleString('fa-IR')}ms`
              : health.db === 'fail'
                ? 'قطع'
                : '...'}
          </span>
        </span>

        <span className="tide-floor__sep" aria-hidden />

        <span className="tide-floor__station">
          <HiOutlineCircleStack className="w-3.5 h-3.5" aria-hidden />
          <span className="tide-floor__station-label">کرون بازار</span>
          <ToneDot tone={health.bazaar} />
          <span className="tide-floor__station-value">
            {health.bazaar === 'ok'
              ? 'فعال'
              : health.bazaar === 'stale'
                ? 'قدیمی'
                : health.bazaar === 'unknown'
                  ? 'نامشخص'
                  : health.bazaar === 'fail'
                    ? 'خطا'
                    : '...'}
          </span>
          <span className="tide-floor__station-meta">{formatRelativeFa(health.bazaarAgeMs)}</span>
        </span>

        <span className="tide-floor__sep" aria-hidden />

        <span className="tide-floor__station tide-floor__station--time">
          <HiOutlineClock className="w-3.5 h-3.5" aria-hidden />
          <span className="tide-floor__station-label">ساعت سرور</span>
          <span className="tide-floor__station-value tabular-nums" dir="ltr">
            {formatTime(health.serverTime)}
          </span>
        </span>
      </div>
    </motion.footer>
  );
}
