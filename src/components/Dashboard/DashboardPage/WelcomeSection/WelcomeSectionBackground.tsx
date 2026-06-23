'use client';

/**
 * WelcomeSectionBackground — calm aurora backdrop.
 *
 * 2026-06-22 (redesign): removed looping orbs / particles / pulsing rings
 * to satisfy `prefers-reduced-motion` and avoid continuous CPU work. The
 * three layered radial gradients provide depth while staying GPU-cheap.
 * All decorative nodes carry `aria-hidden`.
 */
export default function WelcomeSectionBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {/* Primary aurora — cool cyan from top-left */}
      <div
        className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, oklch(70% 0.14 215 / 0.32) 0%, oklch(58% 0.13 230 / 0.12) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Secondary aurora — emerald from bottom-right */}
      <div
        className="absolute -bottom-40 -left-32 w-[460px] h-[460px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, oklch(74% 0.13 165 / 0.22) 0%, oklch(58% 0.12 175 / 0.08) 50%, transparent 70%)',
          filter: 'blur(48px)',
        }}
      />

      {/* Center accent — keeps the focus around the CTA */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, oklch(80% 0.14 80 / 0.12) 0%, transparent 60%)',
          filter: 'blur(36px)',
        }}
      />

      {/* Editorial grid — very low contrast, gives the surface a Notion feel */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'linear-gradient(oklch(100% 0 0 / 0.55) 1px, transparent 1px), linear-gradient(90deg, oklch(100% 0 0 / 0.55) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Hairline divider lines for a magazine spread feel */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, oklch(100% 0 0 / 0.18), transparent)' }}
      />
      <div
        className="absolute bottom-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, oklch(100% 0 0 / 0.10), transparent)' }}
      />
    </div>
  );
}
