'use client';

/**
 * DailyBriefing — tiny hero-side widget (fits inside 220px heroGlyph space).
 *
 * Replaces the clock glyph with:
 *   - Compact priority ring (~80px)
 *   - One action link below
 */

import Link from 'next/link';
import { useMemo } from 'react';
import s from './DailyBriefing.module.css';

interface DailyBriefingProps {
  pending: number;
  urgent: number;
  fraudCount: number;
  txn24h: number;
  activeCustomers: number;
  dealsVolume: number;
  dealsCurrency: string;
  liveEventCount: number;
}

const _faNum = new Intl.NumberFormat('fa-IR');
function fmt(n: number): string {
  return _faNum.format(n);
}

function priorityScore(
  pending: number,
  urgent: number,
  fraudCount: number,
): { score: number; label: string; tone: 'green' | 'amber' | 'red' } {
  let raw = 0;
  raw += Math.min(pending * 2, 30);
  raw += Math.min(urgent * 8, 40);
  raw += Math.min(fraudCount * 15, 30);

  const score = Math.min(100, Math.max(0, raw));

  if (score >= 70) return { score, label: 'بحرانی', tone: 'red' };
  if (score >= 35) return { score, label: 'فعال', tone: 'amber' };
  return { score, label: 'آرام', tone: 'green' };
}

export function DailyBriefing(props: DailyBriefingProps) {
  const { score, label, tone } = useMemo(
    () => priorityScore(props.pending, props.urgent, props.fraudCount),
    [props.pending, props.urgent, props.fraudCount],
  );

  const topAction = useMemo(() => {
    if (props.urgent > 0) {
      return {
        href: '/dashboard/service-requests?filter=urgent',
        label: `${fmt(props.urgent)} فوری`,
        urgent: true,
      };
    }
    if (props.fraudCount > 0) {
      return {
        href: '/dashboard/fraud-review',
        label: `${fmt(props.fraudCount)} هشدار`,
        urgent: true,
      };
    }
    if (props.pending > 0) {
      return {
        href: '/dashboard/service-requests?status=PENDING',
        label: `${fmt(props.pending)} در انتظار`,
        urgent: false,
      };
    }
    return {
      href: '/dashboard/reports',
      label: 'گزارش هفتگی',
      urgent: false,
    };
  }, [props]);

  return (
    <div className={s.root} aria-label="خلاصه روزانه">
      <div className={s.ringWrap}>
        <svg viewBox="0 0 80 80" className={s.ringSvg} aria-hidden>
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--fc-line)" strokeWidth="4" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            className={`${s.ringProgress} ${s[`ring_${tone}`]}`}
            strokeDasharray={`${(score / 100) * 214} 214`}
            strokeDashoffset="53"
          />
        </svg>
        <div className={`${s.ringCenter} ${s[`ringCenter_${tone}`]}`}>
          <span className={s.ringScore} dir="ltr">
            {score}
          </span>
          <span className={s.ringLabel}>{label}</span>
        </div>
      </div>

      <Link
        href={topAction.href}
        className={`${s.actionLink} ${topAction.urgent ? s.actionLinkUrgent : ''}`}
      >
        <span
          className={`${s.actionDot} ${topAction.urgent ? s.actionDotUrgent : ''}`}
          aria-hidden
        />
        <span className={s.actionLabel}>{topAction.label}</span>
      </Link>
    </div>
  );
}
