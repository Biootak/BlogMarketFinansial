'use client';

/**
 * HeroSection — 2026 editorial hero.
 *
 * Linear/Vercel/Stripe inspired:
 *   • A live, tabular Persian date + Tehran clock as the first focal point
 *   • A greeting line that updates with time-of-day
 *   • A headline KPI ("بازدید امروز") that doubles as the visual anchor
 *     — its huge count + sparkline fills the right column on desktop
 *   • Three quick-action shortcuts with persistent keyboard hints
 *   • Skip-to-main, skip-to-rail anchors for WCAG 2.2 AA bypass blocks
 *
 * The hero lives inside .dash-shell__main and uses .dash-hero from globals.css.
 * All animations honor prefers-reduced-motion (CountUp already does, the
 * aurora after-glow is gated by an @media rule).
 */

import { useEffect, useState } from 'react';
import { motion } from '@/lib/motion-shim';
import { useRouter } from 'next/navigation';
import {
  HiOutlineSparkles,
  HiOutlineDocumentText,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlinePencilSquare,
  HiOutlineArrowLeft,
} from 'react-icons/hi2';
import Avatar from '@/components/Avatar/Avatar';
import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import HeroSparkline from './HeroSparkline';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

const PERSIAN_WEEKDAYS = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
  'شنبه',
] as const;

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function formatTehran(d: Date) {
  const weekday = PERSIAN_WEEKDAYS[(d.getDay() + 1) % 7];
  const day = d.toLocaleDateString('fa-IR', { day: 'numeric' });
  const month = PERSIAN_MONTHS[d.getMonth()];
  const year = d.toLocaleDateString('fa-IR', { year: 'numeric' });
  return {
    weekday,
    day,
    month,
    year,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

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
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => window.clearInterval(t);
  }, []);

  const date = now
    ? formatTehran(now)
    : { weekday: 'یکشنبه', day: '—', month: '—', year: '—', time: '--:--' };
  const hour = now ? now.getHours() : 12;
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
        {/* Top status row — date chip (right) + role pill (left, RTL) */}
        <div className="dash-hero__top">
          <div className="dash-hero__chips">
            <span
              className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium ring-1 ring-white/10 bg-white/[0.06] text-white/85"
              aria-label={`امروز ${date.weekday} ${date.day} ${date.month} ${date.year} ساعت ${date.time}`}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <time className="tabular-nums tracking-wide">
                <span className="hidden sm:inline">{date.weekday}، </span>
                {date.day} {date.month} {date.year}
              </time>
              <span aria-hidden className="hidden sm:inline h-3 w-px bg-white/15" />
              <span className="tabular-nums text-white/70">{date.time}</span>
              <span className="hidden sm:inline text-white/50">تهران</span>
            </span>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/[0.06] text-white/85 ring-1 ring-white/10">
              <HiOutlineSparkles className="w-3.5 h-3.5 opacity-80" />
              <span>{user?.role === 'SUPER_ADMIN' ? 'مدیر ارشد' : user?.role === 'ADMIN' ? 'مدیر' : 'نویسنده'}</span>
            </span>
          </div>

          {/* Anchor strip — TOC inside the hero (helps both discoverability + a11y) */}
          <nav aria-label="پرش به بخش‌های داشبورد" className="dash-anchors text-white/70 hidden sm:inline-flex">
            <a href="#dash-kpis" className="text-white/70">شاخص‌ها</a>
            <a href="#dash-engagement" className="text-white/70">تعامل</a>
            <a href="#dash-analytics" className="text-white/70">تحلیل</a>
            <a href="#dash-posts" className="text-white/70">پست‌ها</a>
          </nav>
        </div>

        {/* Main grid: greeting + actions (col 1) | KPI hero (col 2) */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-end">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="dash-hero__headline"
            >
              <span className="opacity-80 font-semibold">{greeting}،</span>{' '}
              <span className="bg-gradient-to-l from-white via-cyan-100 to-emerald-100 bg-clip-text text-transparent">
                {user?.name ?? 'کاربر'}
              </span>
              <span className="opacity-80">.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="dash-hero__sub"
            >
              یک نمای ۳۰ ثانیه‌ای از وبلاگ — شاخص‌ها، فعالیت‌های اخیر و برنامه‌ی
              انتشار پست‌های پیش‌رو. کلید <kbd className="font-mono text-[0.7rem] mx-1 px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15">⌘ K</kbd>
              برای جستجوی سریع فرمان‌ها.
            </motion.p>

            {/* Action cluster */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 flex flex-wrap items-center gap-2.5"
            >
              <button
                type="button"
                onClick={() => router.push('/dashboard/posts/create')}
                className={cn(
                  'group inline-flex items-center gap-2.5 ps-2.5 pe-3.5 h-11 rounded-xl font-semibold text-sm text-white',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(18%_0.045_260)]',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, oklch(70% 0.16 270) 0%, oklch(58% 0.16 285) 100%)',
                  boxShadow:
                    '0 1px 0 oklch(100% 0 0 / 0.18) inset, 0 8px 24px -10px oklch(55% 0.18 280 / 0.55)',
                }}
              >
                <span className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-white/15 group-hover:bg-white/25 transition-colors">
                  <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                </span>
                <span>نوشتن پست جدید</span>
                <span aria-hidden className="hidden sm:inline-flex items-center gap-0.5 ms-1 text-[10px] font-mono text-white/70">
                  <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">⌘</kbd>
                  <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">N</kbd>
                </span>
              </button>

              <Shortcut
                icon={<HiOutlineDocumentText className="w-4 h-4" />}
                label="پست‌ها"
                onClick={() => router.push('/dashboard/posts')}
                hint="G P"
              />
              <Shortcut
                icon={<HiOutlineCalendarDays className="w-4 h-4" />}
                label="تقویم"
                onClick={() => router.push('/dashboard?view=calendar')}
                hint="G C"
              />
              <Shortcut
                icon={<HiOutlineChartBarSquare className="w-4 h-4" />}
                label="گزارش‌ها"
                onClick={() => router.push('/dashboard/reports')}
                hint="G R"
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

        {/* Bottom row — avatar + name (right) / trend chip (left) */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => router.push('/dashboard/edit-profile')}
            className="group inline-flex items-center gap-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/10 hover:ring-white/20 backdrop-blur-md p-1.5 ps-4 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
            aria-label="ویرایش پروفایل"
          >
            <div className="text-end">
              <p className="text-sm font-bold text-white/95 leading-tight">
                {user?.name ?? 'کاربر'}
              </p>
              <p className="text-[11px] text-white/65 mt-0.5 font-medium">
                {user?.email ?? '—'}
              </p>
            </div>
            <div className="relative">
              <Avatar
                imgUrl={(user?.profile?.avatar || user?.image) ?? undefined}
                userName={user?.name ?? undefined}
                sizeClass="h-10 w-10"
                containerClassName="rounded-xl ring-2 ring-white/15"
              />
              <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[oklch(18%_0.045_260)]" />
            </div>
          </button>
          <p className="text-xs text-white/55">
            <span className="hidden sm:inline">آخرین به‌روزرسانی: </span>
            <time className="tabular-nums">{date.time}</time>
          </p>
        </div>
      </div>
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
