/**
 * CustomerConstellation — نقشه SVG از مشتریان (force-directed bubble).
 *
 * signature moment cockpit: یک حباب مرکزی (صرافی) و node هایی به
 * اندازهٔ تراکنش ۳۰ روز اخیر + رنگ بر اساس وضعیت.
 * انیمیشن subtle breathing (نه glow).
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CustomerRow } from '@/actions/exchange-customers';
import { formatNumber } from '@/lib/customer-format';
import s from './CustomerConstellation.module.css';

interface Props {
  /** top customers (max ~12) */
  customers: CustomerRow[];
  /** لیست تراکنش ۳۰ روز اخیر هر مشتری (txn count) */
  activity: Map<string, { count: number; volume: number }>;
  currency: string;
}

interface Node {
  id: string;
  name: string;
  status: string;
  riskScore: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  txnCount: number;
}

interface CenterNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'var(--at-accent)',
  PROSPECT: 'var(--at-gold)',
  FROZEN: 'var(--at-danger)',
  CLOSED: 'var(--at-fg-faint)',
};

function seedRandom(seed: number) {
  // tiny LCG
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function getInitials(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  return (t.split(/\s+/)[0]?.[0] ?? '?').toUpperCase();
}

export function CustomerConstellation({ customers, activity, currency }: Props) {
  const titleId = useId();
  const descId = useId();

  // اندازه‌ها بر اساس aspect ratio کانتینر
  const W = 480;
  const H = 360;
  const center: CenterNode = useMemo(() => ({ x: W / 2, y: H / 2, vx: 0, vy: 0 }), []);

  // ساخت node ها با initial position روی دایره
  const nodesRef = useRef<Node[]>([]);
  // frame counter — فقط برای trigger re-render هر فریم استفاده می‌شود
  const [, setFrame] = useState(0);

  useEffect(() => {
    const rng = seedRandom(42);
    const max = Math.max(
      1,
      ...Array.from(activity.values()).map((a) => a.count || 1),
    );
    const list: Node[] = customers.slice(0, 18).map((c, i) => {
      const angle = (i / Math.max(1, customers.length)) * Math.PI * 2;
      const r = 120 + rng() * 20;
      const act = activity.get(c.id) ?? { count: 0, volume: 0 };
      const radius = 6 + (act.count / max) * 16;
      return {
        id: c.id,
        name: c.fullName,
        status: c.status,
        riskScore: c.riskScore,
        radius,
        x: center.x + Math.cos(angle) * r,
        y: center.y + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        txnCount: act.count,
      };
    });
    nodesRef.current = list;
  }, [customers, activity, center]);

  // انیمیشن simple spring/repel (مرکز جذب می‌کند، node ها همدیگر را دفع می‌کنند)
  useEffect(() => {
    if (customers.length === 0) return;
    let raf = 0;
    let mounted = true;

    const step = () => {
      if (!mounted) return;
      const list = nodesRef.current;
      // Spring toward orbital radius
      const targetR = 130;
      for (const n of list) {
        const dx = n.x - center.x;
        const dy = n.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        // spring
        n.vx += ((dx / dist) * targetR - dx) * 0.0008;
        n.vy += ((dy / dist) * targetR - dy) * 0.0008;

        // node-node repulsion
        for (const m of list) {
          if (m === n) continue;
          const ddx = n.x - m.x;
          const ddy = n.y - m.y;
          const dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          const minDist = n.radius + m.radius + 4;
          if (dd < minDist) {
            const force = (minDist - dd) * 0.04;
            n.vx += (ddx / dd) * force;
            n.vy += (ddy / dd) * force;
          }
        }

        // damping
        n.vx *= 0.86;
        n.vy *= 0.86;
        n.x += n.vx;
        n.y += n.vy;

        // bounds
        n.x = Math.max(n.radius + 4, Math.min(W - n.radius - 4, n.x));
        n.y = Math.max(n.radius + 4, Math.min(H - n.radius - 4, n.y));
      }
      setFrame((t: number) => (t + 1) % 1000000);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // stop after 6s of settle
    const stopTimer = setTimeout(
      () => {
        cancelAnimationFrame(raf);
      },
      6000,
    );

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      clearTimeout(stopTimer);
    };
  }, [customers, center]);

  if (customers.length === 0) {
    return (
      <div className={s.empty}>
        <p className={s.emptyText}>داده‌ای برای نمایش وجود ندارد.</p>
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={s.svg}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>نقشه هم‌بندی مشتریان صرافی</title>
        <desc id={descId}>
          حباب مرکزی نماینده صرافی است. هر node یک مشتری است که اندازه آن بر اساس
          تعداد تراکنش‌های ۳۰ روز اخیر و رنگ بر اساس وضعیت حساب است.
        </desc>

        {/* Background grid (subtle) */}
        <defs>
          <pattern id="constellation-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="var(--at-line)"
              strokeWidth="0.5"
              opacity="0.4"
            />
          </pattern>
          <radialGradient id="center-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.25" />
            <stop offset="60%" stopColor="var(--at-accent)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--at-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#constellation-grid)" />

        {/* Center halo + breathing */}
        <circle
          cx={center.x}
          cy={center.y}
          r="84"
          fill="url(#center-grad)"
          className={s.halo}
        />
        <g className={s.centerGroup}>
          <circle
            cx={center.x}
            cy={center.y}
            r="28"
            fill="var(--at-bg)"
            stroke="var(--at-accent)"
            strokeWidth="1.5"
          />
          <circle
            cx={center.x}
            cy={center.y}
            r="20"
            fill="var(--at-accent-soft)"
            className={s.centerBreath}
          />
          <text
            x={center.x}
            y={center.y + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight={700}
            fill="var(--at-accent-fg)"
            fontFamily="inherit"
          >
            صرافی
          </text>
        </g>

        {/* Links from center to each node (low opacity) */}
        {nodesRef.current.map((n) => (
          <line
            key={`l-${n.id}`}
            x1={center.x}
            y1={center.y}
            x2={n.x}
            y2={n.y}
            stroke={STATUS_COLOR[n.status] ?? 'var(--at-line-strong)'}
            strokeWidth="0.6"
            opacity="0.35"
            strokeDasharray="2 3"
          />
        ))}

        {/* Nodes */}
        {nodesRef.current.map((n) => {
          const color = STATUS_COLOR[n.status] ?? 'var(--at-line-strong)';
          return (
            <g key={n.id} className={s.node} tabIndex={0} role="button" aria-label={n.name}>
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius + 2}
                fill={color}
                opacity="0.12"
              />
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius}
                fill="var(--at-bg)"
                stroke={color}
                strokeWidth="1.5"
              />
              <text
                x={n.x}
                y={n.y + 3}
                textAnchor="middle"
                fontSize={Math.max(8, n.radius * 0.7)}
                fontWeight={700}
                fill={color}
                fontFamily="inherit"
              >
                {getInitials(n.name)}
              </text>
              <text
                x={n.x}
                y={n.y + n.radius + 11}
                textAnchor="middle"
                fontSize="8"
                fill="var(--at-fg-muted)"
                fontFamily="inherit"
              >
                {n.txnCount > 0 ? formatNumber(n.txnCount) : '۰'} تراکنش
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <ul className={s.legend} aria-label="راهنمای رنگ">
        {(['ACTIVE', 'PROSPECT', 'FROZEN', 'CLOSED'] as const).map((k) => (
          <li key={k} className={s.legendItem}>
            <span
              className={s.legendDot}
              style={{ background: STATUS_COLOR[k] }}
              aria-hidden
            />
            <span className={s.legendLabel}>
              {k === 'ACTIVE'
                ? 'فعال'
                : k === 'PROSPECT'
                  ? 'احتمالی'
                  : k === 'FROZEN'
                    ? 'مسدود'
                    : 'بسته'}
            </span>
          </li>
        ))}
      </ul>
      <p className={s.hint}>اندازه = تعداد تراکنش ۳۰ روز اخیر · واحد: {currency}</p>
    </div>
  );
}

export default CustomerConstellation;
