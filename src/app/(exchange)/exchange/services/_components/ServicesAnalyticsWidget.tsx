'use client';

/**
 * ServicesAnalyticsWidget — خلاصه analytics برای صرافی.
 *
 *  نمایش:
 *  - totalClicks (۳۰ روز اخیر)
 *  - topServices (۳ سرویس پرکلیک)
 *  - bySource (profile / marketplace / compare) — donut bar
 *  - recentClicks trend (sparkline ۱۴ روز)
 *
 *  Pattern: Vercel Analytics card — minimal, dense, dark.
 */

import { getServiceMeta } from '@/lib/exchange-services';
import {
  BarChart3,
  ChevronLeft,
  Clock4,
  ExternalLink,
  MousePointerClick,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import s from './ServicesAnalyticsWidget.module.css';

type ServiceCount = { serviceKey: string; serviceName: string; count: number };
type SourceCount = { source: string; count: number };
type DayCount = { date: string; count: number };

type Props = {
  summary: {
    totalClicks: number;
    byService: ServiceCount[];
    bySource: SourceCount[];
    byDay: DayCount[];
  };
  exchangeSlug: string;
};

type MetricAccent = 'emerald' | 'violet' | 'amber' | 'cyan';

export default function ServicesAnalyticsWidget({ summary, exchangeSlug }: Props) {
  const { totalClicks, byService, bySource, byDay } = summary;
  // bySource: array → object map برای دسترسی سریع
  const sourceMap = new Map(bySource.map((b) => [b.source, b.count]));
  const profileClicks = sourceMap.get('profile') ?? 0;
  const marketplaceClicks = sourceMap.get('marketplace') ?? 0;
  const compareClicks = sourceMap.get('compare') ?? 0;

  // trend 14 روز اخیر: byDay ممکن است کمتر باشد، با 0 پر می‌کنیم
  const trend = build14DayTrend(byDay);
  const maxTrend = Math.max(1, ...trend.map((d) => d.count));

  return (
    <div className={s.card} role="region" aria-label="آمار خدمات آنلاین">
      <header className={s.header}>
        <div className={s.headerText}>
          <span className={s.eyebrow}>
            <BarChart3 size={12} strokeWidth={1.9} aria-hidden />
            <span>آمار ۳۰ روز اخیر</span>
          </span>
          <h3 className={s.title}>عملکرد خدمات آنلاین</h3>
        </div>
        <Link href={`/exchanges/${exchangeSlug}#services`} className={s.viewLink}>
          <span>مشاهده در سایت</span>
          <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
        </Link>
      </header>

      {/* ── Top metrics ───────────────────────────────── */}
      <div className={s.metricsGrid}>
        <Metric
          icon={MousePointerClick}
          label="کلیک روی سرویس"
          value={totalClicks}
          accent="emerald"
        />
        <Metric icon={Users} label="منبع: صفحه خدمات" value={marketplaceClicks} accent="violet" />
        <Metric icon={TrendingUp} label="منبع: مقایسه" value={compareClicks} accent="amber" />
        <Metric icon={ExternalLink} label="منبع: پروفایل" value={profileClicks} accent="cyan" />
      </div>

      {/* ── Trend sparkline ───────────────────────────── */}
      {trend.length > 0 && trend.some((d) => d.count > 0) && (
        <div className={s.section}>
          <div className={s.sectionTitle}>
            <Clock4 size={12} strokeWidth={1.9} aria-hidden />
            <span>روند ۱۴ روز اخیر</span>
          </div>
          <div className={s.spark} role="img" aria-label="نمودار روند">
            {trend.map((d) => {
              const h = (d.count / maxTrend) * 100;
              return (
                <div key={d.date} className={s.sparkCol} title={`${d.date}: ${d.count} کلیک`}>
                  <span className={s.sparkBar} style={{ height: `${Math.max(4, h)}%` }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top services ──────────────────────────────── */}
      {byService.length > 0 ? (
        <div className={s.section}>
          <div className={s.sectionTitle}>
            <MousePointerClick size={12} strokeWidth={1.9} aria-hidden />
            <span>پرکلیک‌ترین سرویس‌ها</span>
          </div>
          <ul className={s.topList}>
            {byService.slice(0, 3).map((svc, idx) => {
              const meta = getServiceMeta(svc.serviceKey);
              const Icon = meta?.icon;
              return (
                <li key={svc.serviceKey} className={s.topItem}>
                  <span className={s.topRank}>{idx + 1}</span>
                  <span className={s.topIcon} aria-hidden>
                    {Icon && <Icon size={14} strokeWidth={1.8} />}
                  </span>
                  <span className={s.topName}>{meta?.name ?? svc.serviceName}</span>
                  <span className={s.topCount}>
                    {new Intl.NumberFormat('fa-IR').format(svc.count)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className={s.emptyState}>
          <BarChart3 size={20} strokeWidth={1.5} aria-hidden />
          <p className={s.emptyText}>
            هنوز کلیکی روی خدمات شما ثبت نشده. به محض بازدید مشتریان، آمار اینجا نمایش داده می‌شود.
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  label: string;
  value: number;
  accent: MetricAccent;
}) {
  return (
    <div className={`${s.metric} ${s[`metric-${accent}`]}`}>
      <span className={s.metricIcon} aria-hidden>
        <Icon size={14} strokeWidth={1.8} />
      </span>
      <span className={s.metricValue}>{new Intl.NumberFormat('fa-IR').format(value)}</span>
      <span className={s.metricLabel}>{label}</span>
    </div>
  );
}

/** 2026-07-28: 14 روز اخیر را با 0 پر می‌کند (اگر روزی کلیک نداشت). */
function build14DayTrend(byDay: DayCount[]): DayCount[] {
  const map = new Map(byDay.map((d) => [d.date, d.count]));
  const out: DayCount[] = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date();
    dt.setUTCDate(dt.getUTCDate() - i);
    const dateKey = dt.toISOString().slice(0, 10);
    out.push({ date: dateKey, count: map.get(dateKey) ?? 0 });
  }
  return out;
}
