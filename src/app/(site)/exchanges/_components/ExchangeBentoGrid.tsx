'use client';

/**
 * ExchangeBentoGrid — Asymmetric featured grid of exchanges.
 *
 *   • First exchange = large "hero" card with logo, key rates, sparkline, CTA.
 *   • Remaining exchanges = small uniform tiles.
 *   • Server-rendered data; no client fetching.
 *   • All cards link to /exchanges/[slug].
 */

import { ArrowUpRight, BadgeCheck, Building2, MapPin, Star } from 'lucide-react';
import Link from 'next/link';
import s from './ExchangeBentoGrid.module.css';

export type BentoExchange = {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  city: string | null;
  logoUrl: string | null;
  licenseNo: string | null;
  usdBuy: number | null;
  usdSell: number | null;
  currencyCount: number;
  /** sparkline values for the USD buy rate — last 12 points */
  spark: number[];
  /** composite "score" 0..1 for visual emphasis */
  rankScore: number;
};

type Props = {
  items: BentoExchange[];
  /** Title above the grid */
  heading?: string;
  /** Subtitle below heading */
  subheading?: string;
};

const formatFa = (n: number | null): string => {
  if (n === null || !Number.isFinite(n) || n === 0) return '—';
  return new Intl.NumberFormat('fa-IR').format(Math.round(n));
};

function Sparkline({
  values,
  width = 160,
  height = 36,
}: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.4"
        />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padX = 3;
  const padY = 4;
  const w = width - padX * 2;
  const h = height - padY * 2;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => {
    const x = padX + i * step;
    const y = padY + h - ((v - min) / range) * h;
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], i) => {
      if (i === 0) return `M ${x} ${y}`;
      const [px, py] = points[i - 1];
      const cx = (px + x) / 2;
      return `Q ${cx} ${py} ${x} ${y}`;
    })
    .join(' ');
  const areaPath = `${linePath} L ${padX + w} ${height} L ${padX} ${height} Z`;
  const trend =
    values[values.length - 1] > values[0]
      ? 'up'
      : values[values.length - 1] < values[0]
        ? 'down'
        : 'flat';
  const gid = `bento-spark-${values[0]}-${width}-${height}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={s.spark}
      data-trend={trend}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExchangeLogo({
  name,
  logoUrl,
  size = 44,
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
}) {
  if (logoUrl) {
    // simple img — we don't pull from next/image to avoid remote loader issues
    return (
      <span className={s.logo} style={{ inlineSize: size, blockSize: size }} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" loading="lazy" decoding="async" />
      </span>
    );
  }
  // first letter avatar
  const letter = (name?.trim() ?? '?').charAt(0);
  return (
    <span className={s.logoFallback} style={{ inlineSize: size, blockSize: size }} aria-hidden>
      {letter}
    </span>
  );
}

function FeatureCard({ item, index }: { item: BentoExchange; index: number }) {
  return (
    <Link
      href={`/exchanges/${item.slug}`}
      className={`${s.card} ${s.cardFeature}`}
      style={{ ['--i' as string]: index } as React.CSSProperties}
    >
      <div className={s.featureTop}>
        <div className={s.featureId}>
          <ExchangeLogo name={item.displayName ?? item.name} logoUrl={item.logoUrl} size={56} />
          <div className={s.featureIdText}>
            <h3 className={s.featureName}>
              {item.displayName ?? item.name}
              <BadgeCheck size={16} strokeWidth={2.25} className={s.verified} aria-hidden />
            </h3>
            {item.city && (
              <span className={s.featureMeta}>
                <MapPin size={11} strokeWidth={2.5} aria-hidden />
                {item.city}
              </span>
            )}
            {item.licenseNo && <span className={s.featureLicense}>مجوز {item.licenseNo}</span>}
          </div>
        </div>
        <div className={s.featureBadge}>
          <Star size={11} strokeWidth={2.5} aria-hidden />
          پیشنهاد ویژه
        </div>
      </div>

      <div className={s.featureRates}>
        <div className={s.featureRate}>
          <span className={s.featureRateLabel}>نرخ خرید USD</span>
          <span className={s.featureRateVal} dir="ltr">
            {formatFa(item.usdBuy)}
            <span className={s.featureRateUnit}>تومان</span>
          </span>
        </div>
        <div className={s.featureRateDivider} aria-hidden />
        <div className={s.featureRate}>
          <span className={s.featureRateLabel}>نرخ فروش USD</span>
          <span className={s.featureRateVal} dir="ltr">
            {formatFa(item.usdSell)}
            <span className={s.featureRateUnit}>تومان</span>
          </span>
        </div>
      </div>

      <div className={s.featureBottom}>
        <div className={s.sparkWrap}>
          <span className={s.sparkLabel}>روند اخیر خرید دلار</span>
          <Sparkline values={item.spark} width={180} height={42} />
        </div>
        <span className={s.featureCta}>
          مشاهده پروفایل
          <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function StandardCard({ item, index }: { item: BentoExchange; index: number }) {
  return (
    <Link
      href={`/exchanges/${item.slug}`}
      className={s.card}
      style={{ ['--i' as string]: index } as React.CSSProperties}
    >
      <div className={s.cardTop}>
        <ExchangeLogo name={item.displayName ?? item.name} logoUrl={item.logoUrl} size={40} />
        <div className={s.cardIdText}>
          <h3 className={s.cardName}>
            {item.displayName ?? item.name}
            {item.logoUrl ? (
              <BadgeCheck size={12} strokeWidth={2.25} className={s.verified} aria-hidden />
            ) : null}
          </h3>
          {item.city && (
            <span className={s.cardMeta}>
              <MapPin size={10} strokeWidth={2.5} aria-hidden />
              {item.city}
            </span>
          )}
        </div>
      </div>

      <div className={s.cardRates}>
        <div className={s.cardRate}>
          <span className={s.cardRateLabel}>خرید</span>
          <span className={s.cardRateVal} dir="ltr">
            {formatFa(item.usdBuy)}
          </span>
        </div>
        <div className={s.cardRateMid} aria-hidden />
        <div className={s.cardRate}>
          <span className={s.cardRateLabel}>فروش</span>
          <span className={s.cardRateVal} dir="ltr">
            {formatFa(item.usdSell)}
          </span>
        </div>
      </div>

      <footer className={s.cardFoot}>
        <span className={s.cardFootItem}>
          <Building2 size={10} strokeWidth={2.5} aria-hidden />
          {item.currencyCount} ارز
        </span>
        <span className={s.cardCta}>
          نمایش
          <ArrowUpRight size={11} strokeWidth={2.5} aria-hidden />
        </span>
      </footer>
    </Link>
  );
}

export default function ExchangeBentoGrid({
  items,
  heading = 'صرافی‌های تأییدشده',
  subheading = 'صرافی‌هایی که پس از احراز هویت و بررسی مجوز در فهرست مقایسه قرار گرفته‌اند.',
}: Props) {
  if (items.length === 0) {
    return (
      <div className={s.empty}>
        <Building2 size={28} strokeWidth={1.5} aria-hidden />
        <p>صرافی فعالی برای نمایش موجود نیست.</p>
      </div>
    );
  }

  // Highest-rank item gets the feature slot
  const sorted = [...items].sort((a, b) => b.rankScore - a.rankScore);
  const [first, ...rest] = sorted;

  return (
    <div className={s.section}>
      <header className={s.sectionHeader}>
        <div>
          <h2 className={s.sectionTitle}>{heading}</h2>
          <p className={s.sectionSub}>{subheading}</p>
        </div>
        <div className={s.sectionStat}>
          <span className={s.sectionStatNum}>
            {new Intl.NumberFormat('fa-IR').format(items.length)}
          </span>
          <span className={s.sectionStatLabel}>صرافی فعال</span>
        </div>
      </header>

      <div
        className={s.bento}
        style={{ ['--count' as string]: sorted.length } as React.CSSProperties}
      >
        {first && <FeatureCard item={first} index={0} />}
        {rest.map((item, i) => (
          <StandardCard key={item.id} item={item} index={i + 1} />
        ))}
      </div>
    </div>
  );
}
