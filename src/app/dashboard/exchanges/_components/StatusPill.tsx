'use client';

/**
 * StatusPill — Atelier 2026
 *
 * 3 variants:
 *   - default: rounded pill with pulse dot + label
 *   - inline: small dot only (for tight cells)
 *   - dotOnly: dot only (no border)
 */

import s from './ExchangesWorkspace.module.css';

export type ExchangeStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CLOSED';

interface Props {
  status: ExchangeStatus | string;
  variant?: 'default' | 'inline' | 'dot';
}

const LABEL: Record<string, string> = {
  ACTIVE: 'فعال',
  PENDING: 'در انتظار',
  SUSPENDED: 'معلق',
  CLOSED: 'بسته',
};

const TONE_CLASS: Record<string, string> = {
  ACTIVE: s.statusActive!,
  PENDING: s.statusPending!,
  SUSPENDED: s.statusSuspended!,
  CLOSED: s.statusClosed!,
};

const DOT_CLASS: Record<string, string> = {
  ACTIVE: s.statusDotActive!,
  PENDING: s.statusDotPending!,
  SUSPENDED: s.statusDotSuspended!,
  CLOSED: s.statusDotClosed!,
};

export default function StatusPill({ status, variant = 'default' }: Props) {
  const tone = TONE_CLASS[status] ?? TONE_CLASS.CLOSED;
  const dot = DOT_CLASS[status] ?? DOT_CLASS.CLOSED;
  const label = LABEL[status] ?? status;

  if (variant === 'dot') {
    return <span className={`${s.statusDot} ${dot}`} aria-label={label} />;
  }

  if (variant === 'inline') {
    return (
      <span className={`${s.status} ${s.statusInline} ${tone}`}>
        <span className={s.statusPulse}>
          <span className={s.statusPulseRing} />
          <span className={s.statusPulseCore} />
        </span>
        <span className={s.statusLabel}>{label}</span>
      </span>
    );
  }

  return (
    <span className={`${s.status} ${tone}`}>
      <span className={s.statusPulse}>
        <span className={s.statusPulseRing} />
        <span className={s.statusPulseCore} />
      </span>
      <span className={s.statusLabel}>{label}</span>
    </span>
  );
}
