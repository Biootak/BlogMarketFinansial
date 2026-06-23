'use client';

/**
 * WelcomeSection — 2026 redesign.
 * Linear/Vercel inspired hero strip: quiet surface, tabular date, role pill,
 * primary action, secondary shortcut cluster, and a compact avatar.
 *
 * The visual noise (animated conic-gradient ring, floating particles,
 * rotating hand emoji, multiple status pills) from the previous build was
 * removed in favor of a calm, information-dense hero that respects WCAG
 * contrast and prefers-reduced-motion.
 */

import { motion } from '@/lib/motion-shim';
import WelcomeSectionBackground from './WelcomeSectionBackground';
import WelcomeSectionContent from './WelcomeSectionContent';

export default function WelcomeSection() {
  return (
    <motion.section
      aria-label="نوار خوش‌آمدگویی و اقدام سریع"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl isolate"
      style={{
        background:
          'linear-gradient(135deg, oklch(22% 0.05 265) 0%, oklch(18% 0.045 260) 60%, oklch(14% 0.035 255) 100%)',
        boxShadow:
          '0 1px 0 oklch(100% 0 0 / 0.06) inset, 0 24px 60px -24px oklch(40% 0.14 255 / 0.55), 0 60px 90px -40px oklch(30% 0.10 255 / 0.45)',
      }}
    >
      {/* Static decorative layer — no perpetual motion to avoid jank + a11y issues. */}
      <WelcomeSectionBackground />

      {/* Hairline aurora accent at the top, matches the rest of the dashboard. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(to right, transparent, oklch(80% 0.12 200 / 0.55), oklch(78% 0.14 165 / 0.45), transparent)',
        }}
      />

      {/* Subtle inner highlight */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-24"
        style={{
          background: 'linear-gradient(to bottom, oklch(100% 0 0 / 0.06), transparent)',
        }}
      />

      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <WelcomeSectionContent />
      </div>
    </motion.section>
  );
}
