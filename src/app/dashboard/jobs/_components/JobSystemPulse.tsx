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
 */
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

const HEALTH_COLORS: Record<PulseHealth, { stroke: string; fill: string; glow: string }> = {
  healthy: { stroke: 'oklch(72% 0.14 162)', fill: 'oklch(72% 0.14 162)', glow: 'oklch(72% 0.14 162 / 0.18)' },
  degraded: { stroke: 'oklch(78% 0.14 75)', fill: 'oklch(78% 0.14 75)', glow: 'oklch(78% 0.14 75 / 0.18)' },
  critical: { stroke: 'oklch(68% 0.18 15)', fill: 'oklch(68% 0.18 15)', glow: 'oklch(68% 0.18 15 / 0.18)' },
  idle: { stroke: 'oklch(60% 0.05 255)', fill: 'oklch(60% 0.05 255)', glow: 'oklch(60% 0.05 255 / 0.18)' },
};

export function JobSystemPulse({
  value,
  unit,
  eyebrow,
  sub,
  health,
  active,
}: JobSystemPulseProps) {
  const color = HEALTH_COLORS[health];
  return (
    <svg
      className="job-system-pulse-svg"
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="pulseGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color.fill} stopOpacity="0.3" />
          <stop offset="50%" stopColor={color.fill} stopOpacity="0.06" />
          <stop offset="100%" stopColor={color.fill} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* background glow */}
      <circle cx="100" cy="100" r="90" fill="url(#pulseGlow)" />

      {/* concentric rings */}
      <circle cx="100" cy="100" r="40" fill="none" stroke="oklch(100% 0 0 / 0.06)" strokeWidth="1" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="oklch(100% 0 0 / 0.05)" strokeWidth="1" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="oklch(100% 0 0 / 0.04)" strokeWidth="1" />

      {/* rotating scanner — 3 arcs at different phases */}
      {active ? (
        <>
          <g style={{ transformOrigin: '100px 100px', animation: 'pulseScanner 6s linear infinite' }}>
            <path
              d="M 100 30 A 70 70 0 0 1 170 100"
              fill="none"
              stroke={color.stroke}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.8"
            />
          </g>
          <g style={{ transformOrigin: '100px 100px', animation: 'pulseScanner 8s linear infinite reverse' }}>
            <path
              d="M 100 25 A 75 75 0 0 1 175 100"
              fill="none"
              stroke={color.stroke}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.4"
            />
          </g>
          <g style={{ transformOrigin: '100px 100px', animation: 'pulseScanner 10s linear infinite' }}>
            <path
              d="M 100 20 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={color.stroke}
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
            stroke="oklch(100% 0 0 / 0.18)"
            strokeWidth={i % 3 === 0 ? 1.5 : 0.75}
            strokeLinecap="round"
          />
        );
      })}

      {/* center anchor — pulsing core */}
      <circle
        cx="100"
        cy="100"
        r="6"
        fill={color.fill}
        style={active ? { transformOrigin: '100px 100px', animation: 'pulseCore 1.6s ease-in-out infinite' } : undefined}
      />
      <circle cx="100" cy="100" r="3" fill="oklch(15% 0.012 255)" />

      <style>{`
        @keyframes pulseScanner {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseCore {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.7; }
        }
        @media (prefers-reduced-motion: reduce) {
          g[style*="pulseScanner"], circle[style*="pulseCore"] {
            animation: none !important;
          }
        }
      `}</style>
    </svg>
  );
}

export default JobSystemPulse;
