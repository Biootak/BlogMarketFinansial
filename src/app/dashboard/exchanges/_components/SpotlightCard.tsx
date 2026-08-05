'use client';

/**
 * SpotlightCard — ویژهٔ برجسته‌ترین صرافی
 *   • هدر با monogram بزرگ + نام + status pill
 *   • 3 شاخص کلیدی (کارمزد / مشتری / تراکنش)
 *   • chart روند ۱۴ روز
 */

import { ArrowUpLeft, Crown, MapPin } from 'lucide-react';
import Link from 'next/link';
import s from './ExchangesWorkspace.module.css';
import Monogram from './Monogram';
import Sparkline from './Sparkline';
import StatusPill, { type ExchangeStatus } from './StatusPill';

interface Props {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  status: ExchangeStatus | string;
  customers: number;
  transactions: number;
  platformFee: number;
  growthSeries: number[];
}

const _faNum = new Intl.NumberFormat('fa-IR');
const fmt = (n: number) => _faNum.format(n);

export default function SpotlightCard({
  id,
  name,
  slug,
  city,
  status,
  customers,
  transactions,
  platformFee,
  growthSeries,
}: Props) {
  return (
    <article className={s.spotCard} aria-label={`صرافی برجسته: ${name}`}>
      <header className={s.spotCard__head}>
        <div className={s.spotCard__headLeft}>
          <Monogram name={name} size="xl" shape="square" tone="gold" isLead />
          <div className={s.spotCard__headText}>
            <span className={s.spotCard__chip}>
              <Crown size={10} strokeWidth={2.25} aria-hidden /> Spotlight
            </span>
            <h2 className={s.spotCard__name}>{name}</h2>
            <span className={s.spotCard__meta}>
              {city ? (
                <>
                  <MapPin size={11} strokeWidth={1.75} aria-hidden /> {city}
                </>
              ) : null}
              <span className={s.spotCard__slug}>/{slug}</span>
              <StatusPill status={status} variant="inline" />
            </span>
          </div>
        </div>
        <Link
          href={`/dashboard/exchanges/${id}`}
          className={s.spotCard__cta}
          aria-label={`مشاهدهٔ ${name}`}
        >
          <span>مشاهده</span>
          <ArrowUpLeft size={12} strokeWidth={2.25} aria-hidden />
        </Link>
      </header>

      <div className={s.spotCard__stats}>
        <div className={s.spotCard__stat}>
          <span className={s.spotCard__statNum}>{fmt(customers)}</span>
          <span className={s.spotCard__statLabel}>مشتری</span>
        </div>
        <span className={s.spotCard__statSep} aria-hidden />
        <div className={s.spotCard__stat}>
          <span className={s.spotCard__statNum}>{fmt(transactions)}</span>
          <span className={s.spotCard__statLabel}>تراکنش</span>
        </div>
        <span className={s.spotCard__statSep} aria-hidden />
        <div className={s.spotCard__stat}>
          <span className={s.spotCard__statNum} dir="ltr">
            {platformFee.toFixed(2)}٪
          </span>
          <span className={s.spotCard__statLabel}>کارمزد</span>
        </div>
      </div>

      <div className={s.spotCard__chart}>
        <span className={s.spotCard__chartCap}>
          <span>روند ۱۴ روز اخیر</span>
          <strong>+{fmt(Math.round(growthSeries.reduce((a, b) => a + b, 0) * 0.4))}٪</strong>
        </span>
        <Sparkline
          data={growthSeries}
          width={420}
          height={70}
          tone="gold"
          variant="area"
          ariaLabel={`روند رشد ${name}`}
        />
      </div>
    </article>
  );
}
