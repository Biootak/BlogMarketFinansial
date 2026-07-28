'use client';

/**
 * CustomerSegmentDeepDive — سگمنت‌های عمیق مشتریان صراف.
 *
 * نمای ۴ سگمنت (ACTIVE/PROSPECT/FROZEN/CLOSED) با:
 * - Risk distribution gauge (SVG)
 * - Segment share bars
 * - KYC funnel
 * - قابل انتخاب: کلیک روی هر سگمنت → لیست مشتریان آن سگمنت
 * طرح: spatial-card bento — هر سگمنت card کامل با micro-data.
 */

import type {
  CustomerRow,
  CustomerRiskBucket,
  CustomerSegment,
  CustomerStats,
} from '@/actions/exchange-customers';
import { EmptyState, Section } from '@/components/Dashboard/primitives';
import { ArrowUpRight, Inbox, Shield, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import s from './CustomerSegmentDeepDive.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  exchangeId: string;
  stats: CustomerStats;
  segments: CustomerSegment[];
  riskBuckets: CustomerRiskBucket[];
  customersByStatus: {
    ACTIVE: CustomerRow[];
    PROSPECT: CustomerRow[];
    FROZEN: CustomerRow[];
    CLOSED: CustomerRow[];
  };
  primaryCurrency: string;
}

type SegmentKey = 'ACTIVE' | 'PROSPECT' | 'FROZEN' | 'CLOSED';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEGMENT_META: Record<
  SegmentKey,
  { label: string; tone: string; hint: string }
> = {
  ACTIVE: { label: 'فعال', tone: 'emerald', hint: 'مشتریان با تراکنش اخیر' },
  PROSPECT: { label: 'احتمالی', tone: 'sky', hint: 'در حال ثبت‌نام / بدون تراکنش' },
  FROZEN: { label: 'مسدود', tone: 'amber', hint: 'نیاز به بررسی یا مستندات' },
  CLOSED: { label: 'بسته', tone: 'muted', hint: 'حساب بسته‌شده نهایی' },
};

function formatPct(n: number): string {
  return new Intl.NumberFormat('fa-IR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n / 100);
}

// ─── Risk Gauge (SVG arc) ────────────────────────────────────────────────────

function RiskGauge({ avgScore }: { avgScore: number }) {
  const R = 44;
  const cx = 50;
  const cy = 50;
  const circumference = Math.PI * R; // half circle
  const offset = circumference * (1 - avgScore / 100);
  const tone = avgScore > 70 ? '#f43f5e' : avgScore > 40 ? '#f59e0b' : '#10b981';

  return (
    <svg viewBox="0 0 100 60" aria-label={`میانگین ریسک ${avgScore}`} className={s.gaugesvg}>
      {/* Track */}
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none"
        stroke="var(--at-line)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none"
        stroke={tone}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={`${offset}`}
        style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.22,1,.36,1)' }}
      />
      {/* Label */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="var(--at-text-primary)"
      >
        {avgScore}
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="8" fill="var(--at-text-dim)">
        میانگین ریسک
      </text>
    </svg>
  );
}

// ─── Segment Card ─────────────────────────────────────────────────────────────

function SegmentCard({
  segKey,
  count,
  total,
  active,
  onClick,
}: {
  segKey: SegmentKey;
  count: number;
  total: number;
  active: boolean;
  onClick: () => void;
}) {
  const meta = SEGMENT_META[segKey];
  const share = total > 0 ? (count / total) * 100 : 0;
  const nr = new Intl.NumberFormat('fa-IR');

  return (
    <button
      type="button"
      className={`${s.segCard} ${s[`segCard_${meta.tone}`]} ${active ? s.segCardActive : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <div className={s.segCardTop}>
        <span className={`${s.segPill} ${s[`segPill_${meta.tone}`]}`}>{meta.label}</span>
        <span className={s.segCount}>{nr.format(count)}</span>
      </div>
      <p className={s.segHint}>{meta.hint}</p>
      <div className={s.segBarTrack}>
        <div
          className={`${s.segBarFill} ${s[`segBarFill_${meta.tone}`]}`}
          style={{ width: `${share.toFixed(1)}%` }}
        />
      </div>
      <span className={s.segShare}>{formatPct(share)} از کل</span>
    </button>
  );
}

// ─── Customer Mini-Row ────────────────────────────────────────────────────────

function MiniRow({ c, idx }: { c: CustomerRow; idx: number }) {
  const riskTone = c.riskScore > 70 ? 'rose' : c.riskScore > 40 ? 'amber' : 'emerald';
  return (
    <Link
      href={`/exchange/customers/${c.id}`}
      className={s.miniRow}
      style={{ animationDelay: `${idx * 25}ms` }}
    >
      <div className={s.miniAvatar}>{c.fullName.charAt(0)}</div>
      <div className={s.miniInfo}>
        <span className={s.miniName}>{c.fullName}</span>
        <span className={s.miniPhone} dir="ltr">
          {c.phone}
        </span>
      </div>
      <div className={s.miniMeta}>
        {c.city && <span className={s.miniCity}>{c.city}</span>}
        <span className={`${s.miniRisk} ${s[`miniRisk_${riskTone}`]}`}>{c.riskScore}</span>
      </div>
      <ArrowUpRight size={12} className={s.miniArrow} aria-hidden />
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CustomerSegmentDeepDive({
  exchangeId,
  stats,
  segments,
  riskBuckets,
  customersByStatus,
  primaryCurrency,
}: Props) {
  const [activeSegment, setActiveSegment] = useState<SegmentKey>('ACTIVE');
  const nr = new Intl.NumberFormat('fa-IR');

  const segmentCounts: Record<SegmentKey, number> = {
    ACTIVE: customersByStatus.ACTIVE.length,
    PROSPECT: customersByStatus.PROSPECT.length,
    FROZEN: customersByStatus.FROZEN.length,
    CLOSED: customersByStatus.CLOSED.length,
  };

  const total = Object.values(segmentCounts).reduce((a, b) => a + b, 0);
  const currentList = customersByStatus[activeSegment];

  return (
    <div className={s.root}>
      {/* ── Overview Row ── */}
      <div className={s.overviewRow}>
        {/* Risk Gauge Card */}
        <div className={s.gaugeCard}>
          <div className={s.gaugeHead}>
            <Shield size={15} aria-hidden />
            <span>پروفایل ریسک</span>
          </div>
          <RiskGauge avgScore={Math.round(stats.avgRisk)} />
          <div className={s.riskBuckets}>
            {riskBuckets.map((b) => (
              <div key={b.bucket} className={s.riskBucket}>
                <span className={`${s.riskBucketDot} ${s[`riskDot_${b.tone}`]}`} aria-hidden />
                <span className={s.riskBucketLabel}>{b.label}</span>
                <span className={s.riskBucketCount}>{nr.format(b.count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KYC Funnel Card */}
        <div className={s.kycCard}>
          <div className={s.kycHead}>
            <TrendingUp size={15} aria-hidden />
            <span>قیف KYC</span>
          </div>
          <div className={s.kycFunnel}>
            {[
              { label: 'کل مشتریان', count: stats.total, max: stats.total, tone: 'brand' },
              { label: 'KYC تایید شده', count: stats.kycApproved, max: stats.total, tone: 'emerald' },
              { label: 'در انتظار', count: stats.kycPending, max: stats.total, tone: 'amber' },
              { label: 'ریسک بالا', count: stats.highRisk, max: stats.total, tone: 'rose' },
            ].map((row) => (
              <div key={row.label} className={s.kycRow}>
                <span className={s.kycRowLabel}>{row.label}</span>
                <div className={s.kycRowBar}>
                  <div
                    className={`${s.kycRowFill} ${s[`kycFill_${row.tone}`]}`}
                    style={{
                      width: row.max > 0 ? `${((row.count / row.max) * 100).toFixed(1)}%` : '0%',
                    }}
                  />
                </div>
                <span className={s.kycRowCount}>{nr.format(row.count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Card */}
        <div className={s.growthCard}>
          <div className={s.growthHead}>
            <Users size={15} aria-hidden />
            <span>رشد</span>
          </div>
          <div className={s.growthGrid}>
            <div className={s.growthCell}>
              <span className={s.growthVal}>{nr.format(stats.newLast7d)}</span>
              <span className={s.growthLbl}>مشتری جدید ۷ روز</span>
            </div>
            <div className={s.growthCell}>
              <span className={s.growthVal}>{nr.format(stats.newLast30d)}</span>
              <span className={s.growthLbl}>مشتری جدید ۳۰ روز</span>
            </div>
            <div className={s.growthCell}>
              <span className={s.growthVal}>
                {(stats.activationRate * 100).toFixed(0)}٪
              </span>
              <span className={s.growthLbl}>نرخ فعال‌سازی</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Segment Cards ── */}
      <div className={s.segGrid}>
        {(Object.keys(SEGMENT_META) as SegmentKey[]).map((key) => (
          <SegmentCard
            key={key}
            segKey={key}
            count={segmentCounts[key]}
            total={total}
            active={activeSegment === key}
            onClick={() => setActiveSegment(key)}
          />
        ))}
      </div>

      {/* ── Customer List for Selected Segment ── */}
      <Section
        title={`${SEGMENT_META[activeSegment].label} — ${nr.format(currentList.length)} مشتری`}
        actions={
          <Link href="/exchange/customers" className={s.viewAllLink}>
            مشاهده همه
            <ArrowUpRight size={12} aria-hidden />
          </Link>
        }
      >
        {currentList.length === 0 ? (
          <EmptyState
            title="مشتری‌ای در این سگمنت نیست"
            description="هنوز مشتری‌ای با این وضعیت ثبت نشده است."
            icon={Inbox}
          />
        ) : (
          <div className={s.miniList}>
            {currentList.slice(0, 25).map((c, i) => (
              <MiniRow key={c.id} c={c} idx={i} />
            ))}
            {currentList.length > 25 && (
              <div className={s.moreHint}>
                +{nr.format(currentList.length - 25)} مشتری دیگر — برای مشاهده کامل به لیست
                مراجعه کنید
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
