'use client';

/**
 * LiveOpsPulse — مرکز عملیات زنده (2026)
 * ─────────────────────────────────────────────────────────────
 *  یک ویجت کنترل-روم برای داشبورد ادمین که نبض لحظه‌ای پلتفرم را
 *  نمایش می‌دهد: سلامت سیستم، فعالیت لحظه‌ای، و جریان تراکنش‌ها.
 *  طراحی hairline + brand tokens، RTL-safe، mobile-first.
 *  تمام آیکون‌ها از lucide-react (حرفه‌ای و سازگار با تم).
 */

import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Cpu,
  Gauge,
  type LucideIcon,
  Radio,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import s from './LiveOpsPulse.module.css';

export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'idle';

export interface LiveOpsService {
  id: string;
  name: string;
  desc: string;
  /** یا `icon` (LucideIcon) برای استفاده مستقیم، یا `iconName` برای داده سرور. */
  icon?: LucideIcon;
  iconName?: string;
  status: ServiceStatus;
  latencyMs?: number;
  href?: string;
}

export interface LiveOpsEvent {
  id: string;
  type: 'deposit' | 'withdraw' | 'kyc' | 'order' | 'auth' | 'fraud';
  actor: string;
  detail: string;
  amount?: { value: number; currency: 'IRR' | 'USDT' | 'EUR' | 'TRY' };
  /** ISO string (از سرور) یا number (ms epoch — برای استفاده مستقیم) */
  timestamp: number | string;
  href?: string;
}

export interface LiveOpsPulseProps {
  services: LiveOpsService[];
  events: LiveOpsEvent[];
  /** موج فعالیت ۲۴ ساعت اخیر (هر خانه = یک ساعت) — عدد ۰ تا ۱۰۰ */
  activityBars?: number[];
  /** زمان به‌روزرسانی لحظه‌ای (اختیاری) */
  pollIntervalMs?: number;
  className?: string;
}

const ICON_REGISTRY: Record<string, LucideIcon> = {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Wallet,
  Cpu,
  Gauge,
  Radio,
  Sparkles,
  CircleDashed,
};

const resolveServiceIcon = (svc: LiveOpsService): LucideIcon => {
  if (svc.icon) return svc.icon;
  if (svc.iconName && ICON_REGISTRY[svc.iconName]) return ICON_REGISTRY[svc.iconName];
  return Activity;
};

const STATUS_META: Record<ServiceStatus, { label: string; color: string }> = {
  healthy: { label: 'سالم', color: 'var(--at-success, oklch(70% 0.13 145))' },
  degraded: { label: 'کند', color: 'var(--at-warning, oklch(75% 0.12 75))' },
  down: { label: 'قطع', color: 'var(--at-danger, oklch(65% 0.18 25))' },
  idle: { label: 'بیکار', color: 'var(--at-muted, oklch(60% 0 0))' },
};

const EVENT_META: Record<
  LiveOpsEvent['type'],
  { label: string; icon: LucideIcon; color: string }
> = {
  deposit: { label: 'واریز', icon: ArrowDownRight, color: 'var(--at-success)' },
  withdraw: { label: 'برداشت', icon: ArrowUpRight, color: 'var(--at-warning)' },
  kyc: { label: 'احراز هویت', icon: ShieldCheck, color: 'var(--at-info)' },
  order: { label: 'سفارش', icon: Wallet, color: 'var(--ds-color-brand-primary, var(--at-primary))' },
  auth: { label: 'ورود', icon: CheckCircle2, color: 'var(--at-muted)' },
  fraud: { label: 'هشدار', icon: AlertCircle, color: 'var(--at-danger)' },
};

const toMs = (ts: number | string): number => {
  if (typeof ts === 'number') return ts;
  const ms = new Date(ts).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
};

const formatRel = (ts: number, now: number) => {
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 5) return 'هم اکنون';
  if (diff < 60) return `${diff} ثانیه پیش`;
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  return `${Math.floor(diff / 86400)} روز پیش`;
};

const formatAmount = (n: number) =>
  new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(n);

const formatLatency = (ms?: number) => {
  if (ms == null) return '—';
  if (ms < 1) return '< 1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export function LiveOpsPulse({
  services,
  events,
  activityBars = [],
  pollIntervalMs = 0,
  className,
}: LiveOpsPulseProps) {
  const [now, setNow] = useState(() => Date.now());
  const [waveform, setWaveform] = useState<number[]>(() =>
    Array.from({ length: 28 }, () => Math.random() * 0.6 + 0.1),
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (pollIntervalMs <= 0) return;
    const id = setInterval(() => {
      setWaveform((prev) => {
        const next = prev.slice(1);
        next.push(Math.random() * 0.7 + 0.15);
        return next;
      });
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs]);

  const servicesHealthy = useMemo(
    () => services.filter((x) => x.status === 'healthy').length,
    [services],
  );

  const totalServices = services.length || 1;
  const healthScore = Math.round((servicesHealthy / totalServices) * 100);

  return (
    <div className={`${s.root} ${className ?? ''}`} dir="rtl">
      <div className={s.grid}>
        {/* ── Pulse panel (left, big) ────────────────────────────────────── */}
        <section className={s.pulsePanel} aria-label="نبض پلتفرم">
          <header className={s.pulseHead}>
            <div className={s.pulseHeadMeta}>
              <div className={s.brandDot} aria-hidden>
                <Radio size={12} />
              </div>
              <div>
                <h3 className={s.pulseTitle}>مرکز عملیات زنده</h3>
                <p className={s.pulseSub}>
                  <span className={s.liveDot} aria-hidden /> پایش لحظه‌ای سلامت و فعالیت
                </p>
              </div>
            </div>
            <div className={s.healthPill} data-state={healthScore >= 90 ? 'ok' : healthScore >= 70 ? 'warn' : 'bad'}>
              <Gauge size={13} aria-hidden />
              <span className="tabular-nums">{healthScore}</span>
              <span className={s.healthPillLabel}>٪ سلامت</span>
            </div>
          </header>

          {/* Waveform */}
          <div className={s.wave} role="img" aria-label="موج فعالیت ۲۸ نقطه اخیر">
            {waveform.map((v, i) => (
              <span
                key={i}
                className={s.waveBar}
                style={{ height: `${Math.max(8, v * 100)}%` }}
                data-peak={i === waveform.length - 1 ? 'true' : undefined}
              />
            ))}
          </div>

          {/* 24h strip */}
          <div className={s.strip} role="img" aria-label="نوار فعالیت ۲۴ ساعت اخیر">
            {activityBars.length === 0
              ? Array.from({ length: 24 }).map((_, i) => (
                  <span
                    key={i}
                    className={s.stripBar}
                    style={{ height: `${15 + ((i * 17) % 70)}%` }}
                  />
                ))
              : activityBars.map((v, i) => (
                  <span
                    key={i}
                    className={s.stripBar}
                    style={{ height: `${Math.max(6, Math.min(100, v))}%` }}
                    title={`ساعت ${i}: ${formatAmount(Math.round((v / 100) * 200))}`}
                  />
                ))}
          </div>

          {/* Services */}
          <div className={s.services}>
            <div className={s.servicesHead}>
              <Cpu size={13} aria-hidden />
              <span>سرویس‌های حیاتی</span>
              <span className={s.servicesCount}>
                {servicesHealthy}/{totalServices} فعال
              </span>
            </div>
            <ul className={s.serviceList}>
              {services.map((svc) => {
                const meta = STATUS_META[svc.status];
                const Icon = resolveServiceIcon(svc);
                const inner = (
                  <>
                    <span
                      className={s.serviceIcon}
                      style={{ color: meta.color }}
                      aria-hidden
                    >
                      <Icon size={14} />
                    </span>
                    <span className={s.serviceText}>
                      <span className={s.serviceName}>{svc.name}</span>
                      <span className={s.serviceDesc}>{svc.desc}</span>
                    </span>
                    <span className={s.serviceMeta} data-status={svc.status}>
                      <span
                        className={s.statusDot}
                        style={{ background: meta.color }}
                        aria-hidden
                      />
                      <span className={s.statusLabel}>{meta.label}</span>
                      {svc.latencyMs != null && (
                        <span className={s.latency}>{formatLatency(svc.latencyMs)}</span>
                      )}
                    </span>
                  </>
                );
                return (
                  <li key={svc.id} className={s.serviceItem} data-status={svc.status}>
                    {svc.href ? (
                      <Link href={svc.href} className={s.serviceLink}>
                        {inner}
                      </Link>
                    ) : (
                      <div className={s.serviceLink}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── Activity feed (right) ─────────────────────────────────────── */}
        <section className={s.feedPanel} aria-label="جریان فعالیت">
          <header className={s.feedHead}>
            <div className={s.feedHeadMeta}>
              <Activity size={13} aria-hidden />
              <h3 className={s.feedTitle}>جریان فعالیت</h3>
            </div>
            <span className={s.feedCount}>
              {events.length === 0 ? 'بدون رویداد' : `${formatAmount(events.length)} رویداد`}
            </span>
          </header>

          {events.length === 0 ? (
            <div className={s.feedEmpty}>
              <CircleDashed size={22} aria-hidden />
              <span>در حال گوش دادن به رویدادهای زنده…</span>
            </div>
          ) : (
            <ul className={s.feedList}>
              {events.map((evt) => {
                const meta = EVENT_META[evt.type];
                const Icon = meta.icon;
                const inner = (
                  <>
                    <span
                      className={s.feedIcon}
                      style={{ color: meta.color, background: 'color-mix(in oklch, ' + meta.color + ' 12%, transparent)' }}
                      aria-hidden
                    >
                      <Icon size={13} />
                    </span>
                    <span className={s.feedBody}>
                      <span className={s.feedLine1}>
                        <strong className={s.feedActor}>{evt.actor}</strong>
                        <span className={s.feedAction} style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        {evt.amount && (
                          <span className={s.feedAmount} dir="ltr">
                            {formatAmount(evt.amount.value)}{' '}
                            <span className={s.feedCurrency}>{evt.amount.currency}</span>
                          </span>
                        )}
                      </span>
                      <span className={s.feedLine2}>
                        {evt.detail}
                        <span className={s.feedTime}>· {formatRel(toMs(evt.timestamp), now)}</span>
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={evt.id} className={s.feedItem}>
                    {evt.href ? (
                      <Link href={evt.href} className={s.feedLink}>
                        {inner}
                      </Link>
                    ) : (
                      <div className={s.feedLink}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <footer className={s.feedFoot}>
            <Sparkles size={12} aria-hidden />
            <span>به‌روزرسانی خودکار هر ثانیه</span>
            <span className={s.feedFootTime} dir="ltr">
              {new Date(now).toLocaleTimeString('en-GB', { hour12: false })}
            </span>
          </footer>
        </section>
      </div>
    </div>
  );
}

export default LiveOpsPulse;
