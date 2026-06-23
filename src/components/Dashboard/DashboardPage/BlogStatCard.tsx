'use client';

import { memo, useId } from 'react';
import { motion } from '@/lib/motion-shim';
import CountUp from './CountUp';

export interface BlogStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange';
  trend?: 'up' | 'down' | 'neutral';
  percentage?: number;
  /** سری زمانی برای sparkline — اگر نباشد، نمودار رندر نمی‌شود */
  data?: number[];
}

// نگاشت رنگ‌های قدیمی به پالت Fintech Aurora جدید
const colorConfig: Record<
  BlogStatCardProps['color'],
  { ico: string; stroke: string; glow: string }
> = {
  blue: { ico: 'dash-ico--cyan', stroke: 'oklch(70% 0.13 215)', glow: 'oklch(62% 0.13 215 / 0.16)' },
  green: { ico: 'dash-ico--emerald', stroke: 'oklch(72% 0.14 165)', glow: 'oklch(62% 0.14 165 / 0.16)' },
  purple: { ico: 'dash-ico--violet', stroke: 'oklch(66% 0.17 300)', glow: 'oklch(58% 0.16 298 / 0.16)' },
  red: { ico: 'dash-ico--rose', stroke: 'oklch(68% 0.18 20)', glow: 'oklch(60% 0.18 18 / 0.16)' },
  orange: { ico: 'dash-ico--amber', stroke: 'oklch(80% 0.14 80)', glow: 'oklch(72% 0.14 70 / 0.16)' },
};

const trendConfig = {
  up: { cls: 'dash-trend dash-trend--up', icon: '↑' },
  down: { cls: 'dash-trend dash-trend--down', icon: '↓' },
  neutral: { cls: 'dash-trend dash-trend--flat', icon: '→' },
} as const;

/** Sparkline سبک و بدون وابستگی — area + line با gradient */
function Sparkline({ data, stroke, gradId }: { data: number[]; stroke: string; gradId: string }) {
  const w = 100;
  const h = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full h-8"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const BlogStatCard: React.FC<BlogStatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  percentage,
  data,
}) => {
  const cfg = colorConfig[color];
  const t = trend ? trendConfig[trend] : null;
  const gradId = useId();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group dash-panel dash-panel--hover dash-glow h-full overflow-hidden"
    >
      <div className="relative p-5">
        {/* glow tint on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(circle at 75% 0%, ${cfg.glow}, transparent 70%)` }}
        />

        {/* header row */}
        <div className="relative flex items-start justify-between mb-4">
          <span className={`${cfg.ico} w-11 h-11`}>{icon}</span>
          {t && percentage !== undefined && (
            <span className={t.cls}>
              <span aria-hidden="true">{t.icon}</span>
              <span>{percentage}%</span>
            </span>
          )}
        </div>

        {/* value + title */}
        <div className="relative space-y-1">
          <div className="dash-num text-[1.7rem] font-extrabold text-slate-900 dark:text-white leading-none">
            {typeof value === 'number' ? <CountUp value={value} duration={700} /> : value}
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-[0.8rem] font-medium">{title}</h3>
        </div>

        {/* sparkline */}
        {data && data.length > 1 && (
          <div className="relative mt-3 -mx-1">
            <Sparkline data={data} stroke={cfg.stroke} gradId={`spark-${gradId}`} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default memo(BlogStatCard);
