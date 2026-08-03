'use client';

/**
 * CurrencyConstellation — signature moment of reports page.
 *
 * یک radial SVG که ارزهای مختلف را به‌صورت node هایی به اندازهٔ volume
 * دور یک هستهٔ مرکزی (صراف) می‌چیند. هر node رنگ خودش را دارد و با
 * stroke خودش به hub متصل است.
 *
 * Interactivity (P2026 enhancement):
 *   - hover/focus روی هر node → خط متصل highlight، tooltip panel در کنار SVG
 *   - focus state با keyboard (Tab) برای accessibility
 *   - keyboard: Esc پاک کردن selection
 *
 * Client Component — state برای hover/focus.
 */

import { useCallback, useState } from 'react';
import s from './CurrencyConstellation.module.css';

interface PnLByCurrency {
  currency: string;
  totalVolume: number;
  totalFee: number;
  dealCount: number;
  avgDealSize: number;
}

interface Props {
  pnlByCurrency: PnLByCurrency[];
  totalDeals: number;
}

const NODE_TONE: Record<string, 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose' | 'slate'> = {
  AFN: 'emerald',
  USD: 'emerald',
  EUR: 'cyan',
  IRR: 'amber',
  AED: 'violet',
  GBP: 'cyan',
  PKR: 'amber',
  SAR: 'violet',
  TRY: 'rose',
  default: 'slate',
};

const TONE_COLOR: Record<string, { fill: string; stroke: string }> = {
  emerald: {
    fill: 'color-mix(in oklch, var(--at-accent) 30%, transparent)',
    stroke: 'var(--at-accent)',
  },
  cyan: {
    fill: 'color-mix(in oklch, var(--at-info) 30%, transparent)',
    stroke: 'var(--at-info)',
  },
  violet: {
    fill: 'color-mix(in oklch, var(--at-violet) 30%, transparent)',
    stroke: 'var(--at-violet)',
  },
  amber: {
    fill: 'color-mix(in oklch, var(--at-gold) 30%, transparent)',
    stroke: 'var(--at-gold)',
  },
  rose: {
    fill: 'color-mix(in oklch, var(--at-danger) 30%, transparent)',
    stroke: 'var(--at-danger)',
  },
  slate: {
    fill: 'color-mix(in oklch, var(--at-fg-muted) 25%, transparent)',
    stroke: 'var(--at-fg-muted)',
  },
};

const fmtCompact = (v: number): string =>
  new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v);

const fmtExact = (v: number): string =>
  new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(v);

export default function CurrencyConstellation({ pnlByCurrency, totalDeals }: Props) {
  const [activeCurrency, setActiveCurrency] = useState<string | null>(null);

  const onEnter = useCallback((c: string) => setActiveCurrency(c), []);
  const onLeave = useCallback(() => setActiveCurrency(null), []);

  if (pnlByCurrency.length === 0) {
    return (
      <section className={s.constellation} aria-label="شبکهٔ ارزها">
        <header className={s.head}>
          <span className={s.eyebrow}>
            <span className={s.eyebrowDot} aria-hidden />
            شبکهٔ ارزها
          </span>
          <h2 className={s.title}>هنوز داده‌ای برای نمایش وجود ندارد</h2>
        </header>
      </section>
    );
  }

  // ── geometry ────────────────────────────────────────────────────
  const W = 480;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const hubR = 32;
  const minOrbit = 80;
  const orbitStep = 38;
  const maxNodeR = 28;
  const minNodeR = 12;

  // sort by volume desc + take top 8
  const sorted = [...pnlByCurrency].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 8);
  const maxVol = Math.max(1, ...sorted.map((c) => c.totalVolume));

  const nodes = sorted.map((c, i) => {
    const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2; // start at top
    const orbit = minOrbit + (i % 3) * orbitStep;
    const x = cx + Math.cos(angle) * orbit;
    const y = cy + Math.sin(angle) * orbit;
    const r = minNodeR + (c.totalVolume / maxVol) * (maxNodeR - minNodeR);
    const tone = NODE_TONE[c.currency] ?? NODE_TONE.default;
    const share = totalDeals > 0 ? (c.dealCount / totalDeals) * 100 : 0;
    return { x, y, r, tone, c, angle, orbit, share };
  });

  // tooltip data: hovered or fallback to biggest
  const tooltipNode = nodes.find((n) => n.c.currency === activeCurrency) ?? null;
  const tooltipData = tooltipNode?.c;

  return (
    <section className={s.constellation} aria-label="شبکهٔ ارزها">
      <header className={s.head}>
        <span className={s.eyebrow}>
          <span className={s.eyebrowDot} aria-hidden />
          شبکهٔ ارزها
        </span>
        <h2 className={s.title}>اکوسیستم ارزی صرافی</h2>
        <p className={s.sub}>
          هر حباب یک ارز است؛ اندازهٔ آن نشان‌دهندهٔ سهم از حجم کل، و رنگ آن نشان‌دهندهٔ خانوادهٔ ارزی
          است. روی هر ارز بروید تا جزئیات آن را ببینید.
        </p>
      </header>

      <div className={s.canvas}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          role="presentation"
        >
          <defs>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--at-accent)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hubCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--at-accent)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* concentric orbit guides (very subtle) */}
          {[minOrbit, minOrbit + orbitStep, minOrbit + orbitStep * 2].map((r) => (
            <circle
              key={r}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="var(--at-line)"
              strokeWidth="0.5"
              strokeDasharray="1 4"
              opacity="0.5"
            />
          ))}

          {/* hub glow */}
          <circle cx={cx} cy={cy} r={hubR * 2.4} fill="url(#hubGlow)" className={s.hubGlow} />

          {/* connecting lines (drawn first to be behind nodes) */}
          {nodes.map((n) => {
            const tone = TONE_COLOR[n.tone];
            const isActive = activeCurrency === n.c.currency;
            return (
              <line
                key={`line-${n.c.currency}`}
                x1={cx}
                y1={cy}
                x2={n.x}
                y2={n.y}
                stroke={tone.stroke}
                strokeWidth={isActive ? 1.2 : 0.7}
                strokeDasharray={isActive ? '0' : '2 3'}
                opacity={activeCurrency ? (isActive ? 0.95 : 0.18) : 0.45}
                className={s.connectLine}
                style={{ animationDelay: `${n.c.dealCount * 0.5}ms` }}
              />
            );
          })}

          {/* hub */}
          <circle cx={cx} cy={cy} r={hubR + 8} fill="url(#hubCore)" />
          <circle
            cx={cx}
            cy={cy}
            r={hubR}
            fill="var(--at-bg)"
            stroke="var(--at-accent)"
            strokeWidth="1.5"
            className={s.hubRing}
          />
          <circle cx={cx} cy={cy} r="3" fill="var(--at-accent)" className={s.hubDot} />
          <text
            x={cx}
            y={cy + hubR + 14}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill="var(--at-fg-muted)"
            letterSpacing="0.5"
          >
            صرافی
          </text>

          {/* currency nodes — interactive */}
          {nodes.map((n) => {
            const tone = TONE_COLOR[n.tone];
            const isActive = activeCurrency === n.c.currency;
            const isDimmed = activeCurrency !== null && !isActive;
            return (
              <g
                key={n.c.currency}
                className={s.node}
                data-active={isActive || undefined}
                data-dimmed={isDimmed || undefined}
                tabIndex={0}
                role="button"
                aria-label={`${n.c.currency} — ${fmtCompact(n.c.totalVolume)}`}
                onMouseEnter={() => onEnter(n.c.currency)}
                onMouseLeave={onLeave}
                onFocus={() => onEnter(n.c.currency)}
                onBlur={onLeave}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onLeave();
                }}
              >
                {/* invisible larger hit area for accessibility */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r + 8}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                />
                {/* outer pulse ring */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r + 4}
                  fill="none"
                  stroke={tone.stroke}
                  strokeWidth="0.6"
                  opacity="0.4"
                  className={s.nodeRing}
                  style={{ animationDelay: `${(n.c.dealCount % 8) * 200}ms` }}
                />
                {/* inner fill */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={tone.fill}
                  stroke={tone.stroke}
                  strokeWidth={isActive ? 2.4 : 1.2}
                />
                {/* currency label */}
                <text
                  x={n.x}
                  y={n.y + 3}
                  textAnchor="middle"
                  fontSize={Math.max(9, n.r / 2.2)}
                  fontWeight="700"
                  fill="var(--at-fg)"
                  letterSpacing="0.3"
                >
                  {n.c.currency}
                </text>
                {/* share label outside */}
                <text
                  x={n.x}
                  y={n.y + n.r + 12}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="500"
                  fill="var(--at-fg-muted)"
                >
                  {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(n.share)}٪
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip / details panel — replaces static legend */}
        <aside
          className={s.tooltip}
          data-active={tooltipData ? 'true' : 'false'}
          aria-live="polite"
        >
          {tooltipData ? (
            <>
              <header className={s.tooltipHead}>
                <span
                  className={s.tooltipChip}
                  data-tone={NODE_TONE[tooltipData.currency] ?? NODE_TONE.default}
                >
                  {tooltipData.currency}
                </span>
                <span className={s.tooltipMeta}>
                  {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(
                    (tooltipData.dealCount / Math.max(1, totalDeals)) * 100,
                  )}
                  ٪ کل معاملات
                </span>
              </header>
              <dl className={s.tooltipGrid}>
                <div className={s.tooltipRow}>
                  <dt className={s.tooltipKey}>حجم</dt>
                  <dd className={s.tooltipVal}>
                    {fmtExact(tooltipData.totalVolume)}{' '}
                    <em className={s.tooltipCurrency}>{tooltipData.currency}</em>
                  </dd>
                </div>
                <div className={s.tooltipRow}>
                  <dt className={s.tooltipKey}>کارمزد</dt>
                  <dd className={s.tooltipVal} data-tone="amber">
                    {fmtCompact(tooltipData.totalFee)} <em className={s.tooltipCurrency}>IRR</em>
                  </dd>
                </div>
                <div className={s.tooltipRow}>
                  <dt className={s.tooltipKey}>معاملات</dt>
                  <dd className={s.tooltipVal}>
                    {new Intl.NumberFormat('fa-IR').format(tooltipData.dealCount)}
                  </dd>
                </div>
                <div className={s.tooltipRow}>
                  <dt className={s.tooltipKey}>میانگین</dt>
                  <dd className={s.tooltipVal}>
                    {fmtCompact(tooltipData.avgDealSize)}{' '}
                    <em className={s.tooltipCurrency}>{tooltipData.currency}</em>
                  </dd>
                </div>
              </dl>
              <p className={s.tooltipHint}>
                برای پاک کردن، ماوس را از حباب دور کنید یا <kbd>Esc</kbd> بزنید.
              </p>
            </>
          ) : (
            <>
              <header className={s.tooltipHead}>
                <span className={s.tooltipChip} data-tone="muted">
                  ?
                </span>
                <span className={s.tooltipMeta}>روی هر ارز بروید</span>
              </header>
              <p className={s.tooltipHint}>
                شبکهٔ ارزی صرافی به‌صورت interactive. اندازهٔ هر حباب متناسب با حجم معاملات است.
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
