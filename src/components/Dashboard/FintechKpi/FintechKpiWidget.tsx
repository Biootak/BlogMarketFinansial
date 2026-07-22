'use client';

/**
 * FintechKpiWidget — 2026 Million-Dollar Admin Fintech KPI Strip
 *
 * طراحی: Stripe Dashboard × Brex × Mercury
 * ویژگی‌ها:
 *  - ۵ KPI card با micro sparkline SVG
 *  - trend indicator (+/- percent) با رنگ هوشمند
 *  - glassmorphism surface با layered border
 *  - scroll-reveal stagger entrance
 *  - hover lift + icon scale micro-interaction
 *  - live pulse dot برای هشدار fraud
 *  - RTL-safe (logical properties)
 */

import { ArrowDownRight, ArrowUpRight, Minus, ShieldAlert, Users, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import s from './FintechKpiWidget.module.css';

export interface FintechKpiData {
  txn24h: number;
  activeCustomers: number;
  openFraudCases: number;
  pendingRequests: number;
  dealsVolume: number;
  dealsCurrency: string;
}

interface Props {
  data: FintechKpiData;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVolume(n: number, currency: string): string {
  if (n >= 1_000_000)
    return `${new Intl.NumberFormat('fa-IR').format(Math.round(n / 1_000_000))} م ${currency}`;
  if (n >= 1_000)
    return `${new Intl.NumberFormat('fa-IR').format(Math.round(n / 1_000))} ه ${currency}`;
  return `${new Intl.NumberFormat('fa-IR').format(n)} ${currency}`;
}

/** Generate a deterministic sparkline path from a seed value */
function sparklinePath(seed: number, width = 56, height = 22, points = 7): string {
  const vals: number[] = [];
  let s2 = ((seed * 1234567) >>> 0) % 1000;
  for (let i = 0; i < points; i++) {
    s2 = ((s2 * 1103515245 + 12345) >>> 0) % 1000;
    vals.push((s2 % 80) + 10);
  }
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const range = max - min || 1;
  const coords = vals.map((v, i) => [
    (i / (points - 1)) * width,
    height - ((v - min) / range) * (height - 4) - 2,
  ]);
  return coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
}

/** Simple sparkline that fills below the line */
function Sparkline({ seed, color, height = 22 }: { seed: number; color: string; height?: number }) {
  const width = 56;
  const linePath = sparklinePath(seed, width, height);
  // Close the area path
  const areaSuffix = ` L${width},${height} L0,${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className={s.sparkline}
    >
      <title>sparkline</title>
      <defs>
        <linearGradient id={`sg${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={linePath + areaSuffix} fill={`url(#sg${seed})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Animated count-up hook */
function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    start.current = null;
    const step = (ts: number) => {
      if (start.current === null) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress); // ease-out-quad
      setValue(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [target, duration]);

  return value;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  rawValue: number;
  displayValue: string;
  href: string;
  accent: 'brand' | 'success' | 'error' | 'warn' | 'neutral';
  trend?: number; // percent change — positive means up
  pulse?: boolean;
  delay: number;
}

function KpiCard({
  icon,
  label,
  rawValue,
  displayValue,
  href,
  accent,
  trend,
  pulse,
  delay,
}: KpiCardProps) {
  const animated = useCountUp(rawValue, 900);
  const shown =
    rawValue > 999
      ? displayValue // for formatted values like volume
      : new Intl.NumberFormat('fa-IR').format(animated);

  const trendDir = (trend ?? 0) > 0 ? 'up' : (trend ?? 0) < 0 ? 'down' : 'flat';
  const TrendIcon = trendDir === 'up' ? ArrowUpRight : trendDir === 'down' ? ArrowDownRight : Minus;

  return (
    <Link
      href={href}
      className={`${s.kpiCard} ${s[`accent${accent.charAt(0).toUpperCase()}${accent.slice(1)}`] ?? ''}`}
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`${label}: ${displayValue}`}
    >
      {/* Shine overlay */}
      <span className={s.shine} aria-hidden />

      {/* Icon + sparkline row */}
      <span className={s.topRow}>
        <span className={s.kpiIcon} aria-hidden>
          {icon}
          {pulse && <span className={s.pulseDot} aria-hidden />}
        </span>
        <Sparkline seed={rawValue + label.length} color={`var(--kpi-accent-${accent})`} />
      </span>

      {/* Value */}
      <span className={s.kpiVal} aria-live="polite">
        {shown}
      </span>

      {/* Label + trend */}
      <span className={s.bottomRow}>
        <span className={s.kpiLabel}>{label}</span>
        {trend !== undefined && (
          <span
            className={`${s.trend} ${s[`trend${trendDir.charAt(0).toUpperCase()}${trendDir.slice(1)}`]}`}
          >
            <TrendIcon size={10} aria-hidden />
            {Math.abs(trend).toFixed(1)}٪
          </span>
        )}
      </span>
    </Link>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function FintechKpiWidget({ data }: Props) {
  return (
    <section className={s.root} aria-label="شاخص‌های کلیدی فین‌تک">
      <div className={s.header}>
        <div className={s.headerLeft}>
          <span className={s.eyebrow}>داشبورد فین‌تک</span>
          <span className={s.eyebrowSub}>به‌روز‌رسانی هر ۲ دقیقه</span>
        </div>
        <Link href="/dashboard/wallet" className={s.viewAll}>
          مشاهده کیف پول ←
        </Link>
      </div>

      <div className={s.strip}>
        <KpiCard
          icon={
            <span className={s.iconSvg} aria-hidden>
              ↔
            </span>
          }
          label="تراکنش ۲۴ ساعت"
          rawValue={data.txn24h}
          displayValue={new Intl.NumberFormat('fa-IR').format(data.txn24h)}
          href="/dashboard/audit-log"
          accent="brand"
          trend={4.2}
          delay={0}
        />
        <KpiCard
          icon={<Users size={16} aria-hidden />}
          label="مشتریان فعال"
          rawValue={data.activeCustomers}
          displayValue={new Intl.NumberFormat('fa-IR').format(data.activeCustomers)}
          href="/dashboard/customers"
          accent="success"
          trend={1.8}
          delay={60}
        />
        <KpiCard
          icon={<ShieldAlert size={16} aria-hidden />}
          label="موارد باز تقلب"
          rawValue={data.openFraudCases}
          displayValue={new Intl.NumberFormat('fa-IR').format(data.openFraudCases)}
          href="/dashboard/fraud-review"
          accent={data.openFraudCases > 0 ? 'error' : 'success'}
          trend={data.openFraudCases > 0 ? -2.1 : 0}
          pulse={data.openFraudCases > 0}
          delay={120}
        />
        <KpiCard
          icon={<Zap size={16} aria-hidden />}
          label="درخواست در انتظار"
          rawValue={data.pendingRequests}
          displayValue={new Intl.NumberFormat('fa-IR').format(data.pendingRequests)}
          href="/dashboard/service-requests"
          accent={data.pendingRequests > 5 ? 'warn' : 'neutral'}
          delay={180}
        />
        <KpiCard
          icon={<Wallet size={16} aria-hidden />}
          label="حجم معاملات"
          rawValue={data.dealsVolume}
          displayValue={formatVolume(data.dealsVolume, data.dealsCurrency)}
          href="/dashboard/settlements"
          accent="success"
          trend={12.3}
          delay={240}
        />
      </div>
    </section>
  );
}
