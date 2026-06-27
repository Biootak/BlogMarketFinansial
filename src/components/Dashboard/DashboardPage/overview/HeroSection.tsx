'use client';

/**
 * HeroSection — 2026 compact editorial greeting bar.
 *
 * Redesigned (June 26): the KPI stat card has been removed. It was a
 * duplicate of the KpiGrid hero pane (same "بازدید امروز" metric + the
 * same 7-day sparkline). The hero is now a focused greeting + action
 * surface — the KpiGrid below owns all metric presentation.
 *
 * Design language (Linear × Stripe × Resend):
 *   • Asymmetric layout: greeting on the start, quick-action cluster on
 *     the end (RTL flips automatically).
 *   • Word-by-word headline reveal gated by prefers-reduced-motion.
 *   • Noise grain overlay for premium texture.
 *   • Magnetic primary CTA with a persisted ⌘N shortcut hint.
 *   • Compact height — the hero no longer dominates the viewport.
 *
 * Accessibility:
 *   • All actions are real <button>s / <Link>s with visible focus rings.
 *   • prefers-reduced-motion short-circuits the word-reveal animation.
 */

import { MagneticButton, NoiseTexture } from '@/components/Dashboard/primitives';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
} from 'react-icons/hi2';

function timeOfDay(hour: number) {
  if (hour < 5) return 'بامداد بخیر';
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'بعدازظهر بخیر';
  if (hour < 20) return 'عصر بخیر';
  return 'شب بخیر';
}

export default function HeroSection() {
  const router = useRouter();
  const user = useCurrentUser();
  const [hour, setHour] = useState<number>(12);

  // Greeting hour — updates once per 5 minutes so the toast doesn't tick.
  useEffect(() => {
    const update = () => setHour(new Date().getHours());
    update();
    const t = window.setInterval(update, 5 * 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Detect prefers-reduced-motion on mount.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const greeting = timeOfDay(hour);

  return (
    <motion.section
      id="dash-hero"
      aria-label="نوار خوش‌آمدگویی"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="dash-hero dash-hero--compact"
    >
      <div className="dash-hero__inner dash-hero__inner--compact">
        {/* Greeting + actions — single row on desktop, stacked on mobile */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:gap-6">
          <div className="min-w-0">
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="dash-hero__headline"
            >
              <span
                className="opacity-80 font-semibold dash2-word-reveal"
                style={reduceMotion ? undefined : { animationDelay: '0ms' }}
              >
                {greeting}،&nbsp;
              </span>
              <span
                className="bg-gradient-to-l from-white via-cyan-100 to-emerald-100 bg-clip-text text-transparent dash2-word-reveal"
                style={reduceMotion ? undefined : { animationDelay: '40ms' }}
              >
                {user?.name ?? 'کاربر'}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="dash-hero__sub"
            >
              یک نمای ۳۰ ثانیه‌ای از وبلاگ — شاخص‌ها، فعالیت‌های اخیر و برنامه‌ی انتشار. کلید{' '}
              <kbd className="font-mono text-[0.7rem] mx-1 px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15">
                ⌘ K
              </kbd>{' '}
              برای جستجوی سریع.
            </motion.p>
          </div>

          {/* Action cluster */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-2.5 shrink-0"
          >
            <MagneticButton
              asChild
              magnetRange={6}
              type="button"
              className={cn(
                'group inline-flex items-center gap-2.5 ps-2.5 pe-3.5 h-11 rounded-xl font-semibold text-sm text-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(18%_0.045_260)]',
                '!hover:scale-100 active:!scale-100',
              )}
              style={{
                background:
                  'linear-gradient(135deg, oklch(70% 0.16 270) 0%, oklch(58% 0.16 285) 100%)',
                boxShadow:
                  '0 1px 0 oklch(100% 0 0 / 0.18) inset, 0 8px 24px -10px oklch(55% 0.18 280 / 0.55)',
              }}
            >
              <Link href="/dashboard/posts/create" aria-label="نوشتن پست جدید">
                <span className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-white/15 group-hover:bg-white/25 transition-colors">
                  <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                </span>
                <span>نوشتن پست جدید</span>
                <span
                  aria-hidden
                  className="hidden sm:inline-flex items-center gap-0.5 ms-1 text-[10px] font-mono text-white/70"
                >
                  <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">⌘</kbd>
                  <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">N</kbd>
                </span>
              </Link>
            </MagneticButton>

            <Shortcut
              icon={<HiOutlineDocumentText className="w-4 h-4" />}
              label="پست‌ها"
              onClick={() => router.push('/dashboard/posts')}
            />
            <Shortcut
              icon={<HiOutlineCalendarDays className="w-4 h-4" />}
              label="تقویم"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('dash:set-analytics-tab', {
                    detail: { tab: 'calendar' },
                  }),
                );
                document
                  .getElementById('dash-analytics')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
            <Shortcut
              icon={<HiOutlineChartBarSquare className="w-4 h-4" />}
              label="گزارش‌ها"
              onClick={() => router.push('/dashboard/reports')}
            />
            <Shortcut
              icon={<HiOutlineSparkles className="w-4 h-4" />}
              label="میان‌بر"
              hint="K"
              onClick={() => window.dispatchEvent(new CustomEvent('cmd-palette:open'))}
            />
          </motion.div>
        </div>
      </div>

      {/* Noise overlay — subtle premium texture */}
      <NoiseTexture opacity={0.03} />

      <style jsx global>{`
        @keyframes dash2-word-reveal {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dash2-word-reveal {
          display: inline-block;
          opacity: 0;
          animation: dash2-word-reveal 300ms var(--ds-ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .dash2-word-reveal {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </motion.section>
  );
}

interface ShortcutProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}

function Shortcut({ icon, label, hint, onClick }: ShortcutProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 px-3.5 h-11 rounded-xl text-sm font-medium text-white/85 bg-white/[0.05] hover:bg-white/[0.10] ring-1 ring-white/10 hover:ring-white/20 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer"
    >
      <span className="text-white/70 group-hover:text-white transition-colors">{icon}</span>
      <span>{label}</span>
      {hint && (
        <kbd className="hidden sm:inline-flex items-center gap-1 me-1 text-[10px] font-mono font-medium text-white/45 border border-white/10 rounded-md px-1.5 py-0.5 bg-white/[0.02]">
          {hint}
        </kbd>
      )}
    </button>
  );
}
