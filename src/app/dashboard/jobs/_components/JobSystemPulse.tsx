/**
 * JobSystemPulse — signature SVG
 *
 * یک رادیال کینتیک که «نبض» سیستم را نشان می‌دهد.
 * - ۴ حلقه هم‌مرکز با فازهای متفاوت
 * - یک اسکنر که دور مرکز می‌چرخد
 * - نقطه مرکزی که با ۰.۵ هرتز نفس می‌کشد
 *
 * عدد مرکزی (anchor) از props می‌آید؛ بنابراین SVG داده‌محور است.
 * - می‌تواند throughput ساعت گذشته، یا میانگین ms باشد.
 *
 * همهٔ رنگ‌ها از کلاس‌های CSS module (`pulseSvg--{health}`) می‌آیند؛
 * SVG فقط از `currentColor` و متغیرهای CSS محلی استفاده می‌کند.
 */
import s from '../jobs.module.css';

type PulseHealth = 'healthy' | 'degraded' | 'critical' | 'idle';

export interface JobSystemPulseProps {
  value: string;
  unit: string;
  eyebrow: string;
  sub: string;
  /** رنگ anchor — روی رنگ stage تأثیر می‌گذارد */
  health: PulseHealth;
  /** فعال/غیرفعال‌بودن انیمیشن — برای reduced-motion */
  active: boolean;
}

export function JobSystemPulse({
  value: _value,
  unit: _unit,
  eyebrow: _eyebrow,
  sub: _sub,
  health,
  active,
}: JobSystemPulseProps) {
  return (
    <svg
      className={`${s.pulseSvg} ${s[`pulseSvg--${health}`]}`}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="pulseGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.06" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* background glow */}
      <circle cx="100" cy="100" r="90" fill="url(#pulseGlow)" />

      {/* concentric rings */}
      <circle cx="100" cy="100" r="40" className={s.pulseRing1} />
      <circle cx="100" cy="100" r="60" className={s.pulseRing2} />
      <circle cx="100" cy="100" r="80" className={s.pulseRing3} />

      {/* rotating scanner — 3 arcs at different phases */}
      {active ? (
        <>
          <g className={s.pulseScanner}>
            <path
              d="M 100 30 A 70 70 0 0 1 170 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.8"
            />
          </g>
          <g className={`${s.pulseScanner} ${s['pulseScanner--slow']}`}>
            <path
              d="M 100 25 A 75 75 0 0 1 175 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.4"
            />
          </g>
          <g className={`${s.pulseScanner} ${s['pulseScanner--slowest']}`}>
            <path
              d="M 100 20 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.2"
            />
          </g>
        </>
      ) : null}

      {/* tick marks at 12 positions */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const r1 = 86;
        const r2 = i % 3 === 0 ? 78 : 82;
        const x1 = 100 + r1 * Math.cos(angle - Math.PI / 2);
        const y1 = 100 + r1 * Math.sin(angle - Math.PI / 2);
        const x2 = 100 + r2 * Math.cos(angle - Math.PI / 2);
        const y2 = 100 + r2 * Math.sin(angle - Math.PI / 2);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className={i % 3 === 0 ? s.pulseTickMajor : s.pulseTickMinor}
          />
        );
      })}

      {/* center anchor — pulsing core */}
      <circle
        cx="100"
        cy="100"
        r="6"
        className={active ? s.pulseCore : `${s.pulseCore} ${s['pulseCore--paused']}`}
      />
      <circle cx="100" cy="100" r="3" className={s.pulseCoreInner} />
    </svg>
  );
}

export default JobSystemPulse;
