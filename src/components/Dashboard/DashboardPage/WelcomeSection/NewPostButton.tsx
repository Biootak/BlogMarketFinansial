'use client';

/**
 * NewPostButton — 2026 redesign.
 *
 * The previous version used a perpetual CSS shimmer animation, an inline
 * sparkle that slid in on hover and a hard-coded white→slate gradient.
 * Those have all been removed in favor of:
 *   • a single high-contrast gradient that reads on both light/dark
 *   • a static ⌘N keyboard hint chip (Linear style)
 *   • focus-visible ring (WCAG 2.2 AA)
 *   • no perpetual CSS animation
 */

import { motion } from '@/lib/motion-shim';
import { useRouter } from 'next/navigation';
import { HiOutlinePencilSquare } from 'react-icons/hi2';

export default function NewPostButton() {
  const router = useRouter();

  return (
    <motion.button
      type="button"
      onClick={() => router.push('/dashboard/posts/create')}
      whileTap={{ scale: 0.97 }}
      className="group relative inline-flex items-center gap-2.5 ps-2.5 pe-3.5 h-10 rounded-xl font-semibold text-sm text-white overflow-hidden transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(18%_0.045_260)] focus-visible:ring-cyan-300/80"
      style={{
        background:
          'linear-gradient(135deg, oklch(70% 0.16 270) 0%, oklch(58% 0.16 285) 100%)',
        boxShadow:
          '0 1px 0 oklch(100% 0 0 / 0.18) inset, 0 8px 24px -10px oklch(55% 0.18 280 / 0.55), 0 1px 2px oklch(0% 0 0 / 0.2)',
      }}
    >
      {/* Subtle inner ring on hover only — no shimmer loop. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          boxShadow: '0 0 0 1px oklch(100% 0 0 / 0.18) inset, 0 12px 32px -8px oklch(60% 0.18 280 / 0.7)',
        }}
      />

      <span
        className="relative flex items-center justify-center w-6 h-6 rounded-md bg-white/15 group-hover:bg-white/25 transition-colors"
        aria-hidden="true"
      >
        <HiOutlinePencilSquare className="w-3.5 h-3.5 text-white" />
      </span>

      <span className="relative">نوشتن پست جدید</span>

      <span
        aria-hidden="true"
        className="relative hidden sm:inline-flex items-center gap-0.5 ms-1 text-[10px] font-mono font-semibold tracking-wider text-white/70"
      >
        <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">⌘</kbd>
        <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">N</kbd>
      </span>
    </motion.button>
  );
}
