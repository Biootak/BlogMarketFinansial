'use client';

/**
 * BroadcastPulse — signature visual برای Communication Hub.
 * ---------------------------------------------------------------------------
 *  متافور: یک برج پخش رادیویی (broadcast tower) در مرکز، که ۴ کانال
 *  (Push, Email, SMS, In-app) مثل ماهواره به دور آن می‌چرخند.
 *  هر کانال یک «ایستگاه» دارد که خودش یک «میدان» (radial pulse)
 *  با شدت متراکم پخش می‌کند — هر چه تعداد ارسال بیشتر، میدان بزرگ‌تر.
 *
 *  این کامپوننت جایگزین الگوی «۶ کارت متریک + ۳ ستون grid» شد.
 *  - مبتنی بر توکن‌های سایت (`--ds-*` و `oklch` از HUB_PALETTES.communication)
 *  - RTL-correct (با `transform: scaleX(-1)` در RTL منطقی نیست؛ همه چیز بر اساس viewport است)
 *  - انیمیشن‌ها CSS-only و 60fps
 *  - interactive: hover روی هر node، tooltip اطلاعاتی نشان می‌دهد
 */

import { cn } from '@/lib/utils';
import { HUB_PALETTES, toOklch } from './HubPalette';
import s from './PlatformHub.module.css';

export type BroadcastChannelId = 'push' | 'email' | 'sms' | 'inapp';

export interface BroadcastChannel {
  id: BroadcastChannelId;
  label: string;
  /** مقدار فعلی (تعداد پیام / گیرنده) */
  value: number;
  /** برچسب واحد (مثلاً «پیام» یا «گیرنده») */
  unit: string;
  /** tone برای رنگ node */
  tone: 'emerald' | 'indigo' | 'amber' | 'violet';
  /** لینک به sub-route مربوطه (اختیاری) */
  href?: string;
}

export interface BroadcastPulseProps {
  channels: BroadcastChannel[];
  /** آمار کلی — در برچسب مرکزی نشان داده می‌شود */
  total: { sent: number; recipients: number };
  /** عنوان کوتاه مرکز */
  centerLabel?: string;
  /** کلاس اضافی */
  className?: string;
  /** aria-label */
  ariaLabel?: string;
}

const TONE_HUE: Record<BroadcastChannel['tone'], number> = {
  emerald: 165,
  indigo: 245,
  amber: 70,
  violet: 290,
};

const TONE_CHROMA: Record<BroadcastChannel['tone'], number> = {
  emerald: 0.12,
  indigo: 0.13,
  amber: 0.12,
  violet: 0.13,
};

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));

/**
 * محاسبه زاویه هر کانال روی دایره.
 * چون RTL هستیم ولی زاویه‌ها relative هستند، نیازی به mirror نیست.
 * ترتیب ۴ کانال: push (بالا-راست), email (پایین-راست), sms (پایین-چپ), inapp (بالا-چپ)
 */
function nodePosition(index: number, total: number, radius: number) {
  // شروع از -90deg (بالا) و چرخش ساعتگرد
  const startAngle = -90;
  const angle = startAngle + (360 / total) * index;
  const rad = (angle * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(rad),
    y: 50 + radius * Math.sin(rad),
    angle,
  };
}

export function BroadcastPulse({
  channels,
  total,
  centerLabel = 'مرکز پخش',
  className,
  ariaLabel = 'نمودار برج پخش و کانال‌ها',
}: BroadcastPulseProps) {
  const palette = HUB_PALETTES.communication;
  const accent = toOklch(palette.primary);
  const accentSoft = toOklch(palette.primary, 0.4);

  // max value برای normalize
  const maxValue = Math.max(1, ...channels.map((c) => c.value));

  // شعاع دایره (موقعیت node ها)
  const radius = 36; // درصد از viewBox
  // شعاع pulse ring (میدان)
  const maxFieldRadius = 14; // درصد

  // total sent → بزرگی دایره مرکز
  const totalSent = total.sent;
  const totalFmt = totalSent > 0 ? fmtPersian(totalSent) : '۰';

  return (
    <div className={cn(s.broadcastPulse, className)} role="img" aria-label={ariaLabel}>
      <svg
        viewBox="0 0 100 100"
        className={s.broadcastPulseSvg}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <radialGradient id="broadcast-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
            <stop offset="60%" stopColor={accent} stopOpacity="0.7" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.05" />
          </radialGradient>
          <radialGradient id="broadcast-ring" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.4" />
          </radialGradient>
        </defs>

        {/* لایه ۱: pulse rings پس‌زمینه (از مرکز به بیرون) */}
        {[0, 1, 2].map((i) => (
          <circle
            key={`wave-${i}`}
            cx="50"
            cy="50"
            r={32 + i * 6}
            fill="none"
            stroke={accentSoft}
            strokeWidth="0.15"
            className={s.broadcastWave}
            style={{ animationDelay: `${i * 0.6}s` }}
          />
        ))}

        {/* لایه ۲: خطوط ارتباطی (center → node) با dash animation */}
        {channels.map((ch, i) => {
          const pos = nodePosition(i, channels.length, radius);
          const toneColor = `oklch(60% ${TONE_CHROMA[ch.tone]} ${TONE_HUE[ch.tone]})`;
          return (
            <line
              key={`line-${ch.id}`}
              x1="50"
              y1="50"
              x2={pos.x}
              y2={pos.y}
              stroke={toneColor}
              strokeWidth="0.18"
              strokeLinecap="round"
              opacity="0.5"
              className={s.broadcastArc}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          );
        })}

        {/* لایه ۳: میدان هر node (field) — شعاع متناسب با value */}
        {channels.map((ch, i) => {
          const pos = nodePosition(i, channels.length, radius);
          const intensity = ch.value / maxValue; // 0..1
          const fieldR = intensity * maxFieldRadius + 3;
          const toneColor = `oklch(60% ${TONE_CHROMA[ch.tone]} ${TONE_HUE[ch.tone]})`;
          return (
            <circle
              key={`field-${ch.id}`}
              cx={pos.x}
              cy={pos.y}
              r={fieldR}
              fill={toneColor}
              opacity={0.12 + intensity * 0.18}
              className={s.broadcastWave}
              style={{ animationDelay: `${0.4 + i * 0.18}s` }}
            />
          );
        })}

        {/* لایه ۴: node ها (ایستگاه‌ها) */}
        {channels.map((ch, i) => {
          const pos = nodePosition(i, channels.length, radius);
          const toneColor = `oklch(60% ${TONE_CHROMA[ch.tone]} ${TONE_HUE[ch.tone]})`;
          const toneColorDark = `oklch(40% ${TONE_CHROMA[ch.tone]} ${TONE_HUE[ch.tone]})`;
          return (
            <g key={`node-${ch.id}`} className={s.broadcastNode}>
              {/* ring outline */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="5.2"
                fill="var(--ds-surface, white)"
                stroke={toneColor}
                strokeWidth="0.6"
              />
              {/* center dot */}
              <circle cx={pos.x} cy={pos.y} r="2.4" fill={toneColor} />
              {/* halo when active */}
              {ch.value > 0 ? (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="3.4"
                  fill="none"
                  stroke={toneColorDark}
                  strokeWidth="0.3"
                  opacity="0.4"
                  className={s.broadcastWave}
                  style={{ animationDelay: `${0.8 + i * 0.18}s` }}
                />
              ) : null}
            </g>
          );
        })}

        {/* لایه ۵: برج مرکز (broadcast tower) */}
        <g transform="translate(50 50)">
          {/* glow ring */}
          <circle cx="0" cy="0" r="13" fill="url(#broadcast-center)" />
          {/* central disc */}
          <circle
            cx="0"
            cy="0"
            r="9"
            fill="var(--ds-surface, white)"
            stroke={accent}
            strokeWidth="0.5"
          />
          {/* tower icon (antenna) */}
          <g stroke={accent} strokeWidth="0.6" strokeLinecap="round" fill="none">
            {/* tower base (triangle) */}
            <path d="M -3 4 L 3 4 L 0 -5 Z" />
            {/* cross beams */}
            <line x1="-2.2" y1="0" x2="2.2" y2="0" />
            <line x1="-2.6" y1="2" x2="2.6" y2="2" />
            {/* antenna spike */}
            <line x1="0" y1="-5" x2="0" y2="-8" />
            <circle cx="0" cy="-8" r="0.7" fill={accent} />
            {/* radio waves */}
            <path d="M -1.5 -8.5 Q 0 -10 1.5 -8.5" opacity="0.5" />
            <path d="M -2.5 -9.5 Q 0 -12 2.5 -9.5" opacity="0.3" />
          </g>
        </g>
      </svg>

      {/* Center label overlay */}
      <div className={s.broadcastCenterLabel}>
        <span className={s.broadcastCenterValue}>{totalFmt}</span>
        <span className={s.broadcastCenterSub}>{centerLabel}</span>
      </div>

      {/* Channel legend (overlaid on each node) */}
      <ul className={s.broadcastLegend}>
        {channels.map((ch, i) => {
          const pos = nodePosition(i, channels.length, radius);
          // تنظیم position نسبی — تبدیل از viewBox به percentage
          return (
            <li
              key={`label-${ch.id}`}
              className={s.broadcastLegendItem}
              data-tone={ch.tone}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
            >
              <span className={s.broadcastLegendValue}>{fmtPersian(ch.value)}</span>
              <span className={s.broadcastLegendLabel}>{ch.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
