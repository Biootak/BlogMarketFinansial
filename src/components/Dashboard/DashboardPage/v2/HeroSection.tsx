'use client';

/**
 * HeroSection — 2026 editorial greeting + KPI hero card.
 *
 * Rendered only on `/dashboard`. Identity chrome (avatar, role, Tehran
 * clock, page breadcrumb) now lives in the persistent `Header`, so the
 * hero is focused on the two things that genuinely belong on the home
 * canvas:
 *
 *   1. A greeting line that updates with time-of-day.
 *   2. A headline KPI ("بازدید امروز") with a 7-day sparkline as the
 *      visual anchor, plus three quick-action shortcuts.
 *
 * Design language (Linear × Stripe × Resend):
 *   • Asymmetric layout: greeting + actions on the start, KPI hero card
 *     on the end (RTL flips automatically).
 *   • Word-by-word headline reveal gated by prefers-reduced-motion.
 *   • Noise grain overlay (`.dash2-noise`) for premium texture.
 *   • Anchor strip (TOC) for in-page jump navigation.
 *   • Magnetic primary CTA with a persisted ⌘N shortcut hint.
 *
 * Accessibility:
 *   • Skip-to-rail anchor (live in the parent main).
 *   • All actions are real <button>s / <Link>s with visible focus rings.
 *   • `prefers-reduced-motion` short-circuits the word-reveal animation.
 */

import { useEffect, useState } from 'react';
import { motion } from '@/lib/motion-shim';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HiOutlineSparkles,
  HiOutlineDocumentText,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlinePencilSquare,
  HiOutlineArrowLeft,
} from 'react-icons/hi2';
import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { MagneticButton, NoiseTexture } from '@/components/Dashboard/primitives';
import HeroSparkline from './HeroSparkline';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

function timeOfDay(hour: number) {
  if (hour < 5) return 'بامداد بخیر';
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'بعدازظهر بخیر';
  if (hour < 20) return 'عصر بخیر';
  return 'شب بخیر';
}

interface HeroSectionProps {
  /** 7-day sparkline (today views per day). */
  sparkData: number[];
  todayViews: number;
  totalViews: number;
}

export default function HeroSection({ sparkData, todayViews, totalViews }: HeroSectionProps) {
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

  // Detect prefers-reduced-motion on mount. The CSS keyframe block also
  // short-circuits via @media, but the JS check lets us avoid emitting
  // per-span animationDelay inline when it would never animate.
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
      aria-label="نوار خوش‌آمدگویی و شاخص روز"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="dash-hero"
    >
      <div className="dash-hero__inner">
        {/* Anchor strip — in-page TOC. Identity + clock now live in the
            persistent Header so this strip doesn't duplicate them. */}
        <nav
          aria-label="پرش به بخش‌های داشبورد"
          className="dash-anchors text-white/70 hidden sm:inline-flex"
        >
          <a href="#dash-kpis">شاخص‌ها</a>
          <a href="#dash-engagement">تعامل</a>
          <a href="#dash-analytics">تحلیل</a>
          <a href="#dash-posts">پست‌ها</a>
        </nav>

        {/* Main grid: greeting + actions (col 1) | KPI hero (col 2) */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-end">
          <div>
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
              <span
                className="opacity-80 dash2-word-reveal"
                style={reduceMotion ? undefined : { animationDelay: '80ms' }}
              >
                .
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="dash-hero__sub"
            >
              یک نمای ۳۰ ثانیه‌ای از وبلاگ — شاخص‌ها، فعالیت‌های اخیر و برنامه‌ی
              انتشار پست‌های پیش‌رو. کلید{' '}
              <kbd className="font-mono text-[0.7rem] mx-1 px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15">
                ⌘ K
              </kbd>{' '}
              برای جستجوی سریع فرمان‌ها.
            </motion.p>

            {/* Action cluster */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 flex flex-wrap items-center gap-2.5"
            >
              <MagneticButton
                asChild
                magnetRange={6}
                type="button"
                className={cn(
                  'group inline-flex items-center gap-2.5 ps-2.5 pe-3.5 h-11 rounded-xl font-semibold text-sm text-white',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(18%_0.045_260)]',
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
                  // Bridge to AnalyticsCanvas via a window CustomEvent so
                  // the tab switch happens in-place without a route
                  // roundtrip. Pairs with the listener in AnalyticsCanvas.
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
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('cmd-palette:open'))
                }
              />
            </motion.div>
          </div>

          {/* KPI hero card — composed of the today-views count + sparkline */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="dash-hero__stat"
            aria-label={`${todayViews.toLocaleString('fa-IR')} بازدید امروز`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.7rem] font-semibold text-white/60 uppercase tracking-wider">
                بازدید امروز
              </span>
              <a
                href="#dash-kpis"
                className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white transition-colors"
              >
                همه شاخص‌ها
                <HiOutlineArrowLeft className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-baseline gap-2">
              <CountUp
                value={todayViews}
                className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums text-white"
              />
              <span className="text-sm text-white/70 font-medium">بازدید</span>
            </div>
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="tabular-nums">
                از {totalViews.toLocaleString('fa-IR')} بازدید کل
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                <span className="dash-livedot" />
                زنده
              </span>
            </div>
            <div className="-mx-2 -mb-2 mt-1">
              <HeroSparkline data={sparkData} stroke="oklch(78% 0.13 220)" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Noise overlay — sits on top of every hero layer (gradient, grid,
          headline, KPI card). Pointer-events-none is set inside the
          primitive. Slightly higher than the default 0.025 because the
          dark hero needs more grain to read. */}
      <NoiseTexture opacity={0.03} />

      {/* Scoped keyframes for the headline word reveal. The CSS @media
          rule below disables the animation for prefers-reduced-motion
          users, so the JSX-side reduceMotion check is just an
          optimization that skips the inline animationDelay style
          emission. */}
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
      className="group inline-flex items-center gap-2 px-3.5 h-11 rounded-xl text-sm font-medium text-white/85 bg-white/[0.05] hover:bg-white/[0.10] ring-1 ring-white/10 hover:ring-white/20 backdrop-blur-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
    >
      <span className="text-white/70 group-hover:text-white transition-colors">
        {icon}
      </span>
      <span>{label}</span>
      {hint && (
        <kbd className="hidden sm:inline-flex items-center gap-1 me-1 text-[10px] font-mono font-medium text-white/45 border border-white/10 rounded-md px-1.5 py-0.5 bg-white/[0.02]">
          {hint}
        </kbd>
      )}
    </button>
  );
}
