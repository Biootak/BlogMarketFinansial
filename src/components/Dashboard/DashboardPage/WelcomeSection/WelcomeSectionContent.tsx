'use client';

/**
 * WelcomeSectionContent — 2026 redesign.
 *
 * Linear/Vercel/Stripe inspired hero strip:
 *  • Top row: tabular date (Asia/Tehran) on the right, role pill on the left
 *  • Greeting + name in a single tight headline (no wave emoji / shimmer)
 *  • Compact avatar with online status dot — no rotating conic ring
 *  • Primary CTA + 3 secondary shortcut actions (with ⌘K-style hints)
 *  • Live Tehran time on the right for editorial weight
 *
 * All interactive elements use visible focus rings and Persian labels
 * (WCAG 2.2 AA). The previous `style jsx` for the rotating conic ring and
 * the looping hand-emoji animation were dropped in favor of a single
 * entrance motion that respects `prefers-reduced-motion`.
 */

import { useEffect, useState } from 'react';
import { motion } from '@/lib/motion-shim';
import {
  HiOutlineDocumentText,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import Avatar from '@/components/Avatar/Avatar';
import NewPostButton from './NewPostButton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'مدیر ارشد',
  ADMIN: 'مدیر',
  AUTHOR: 'نویسنده',
  USER: 'کاربر',
};

const roleStyles: Record<string, { dot: string; chip: string; label: string }> = {
  SUPER_ADMIN: {
    dot: 'bg-slate-300/80',
    chip: 'bg-white/[0.08] text-slate-100 ring-white/15',
    label: 'text-slate-100',
  },
  ADMIN: {
    dot: 'bg-slate-300/80',
    chip: 'bg-white/[0.08] text-slate-100 ring-white/15',
    label: 'text-slate-100',
  },
  AUTHOR: {
    dot: 'bg-slate-300/80',
    chip: 'bg-white/[0.08] text-slate-100 ring-white/15',
    label: 'text-slate-100',
  },
  USER: {
    dot: 'bg-slate-300/80',
    chip: 'bg-white/[0.08] text-slate-100 ring-white/15',
    label: 'text-slate-100',
  },
};

const PERSIAN_WEEKDAYS = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
  'شنبه',
];

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
];

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function formatTehranDate(d: Date) {
  // Uses fa-IR locale for the weekday + month, then assembles the final string.
  const weekday = PERSIAN_WEEKDAYS[(d.getDay() + 1) % 7];
  const day = d.toLocaleDateString('fa-IR', { day: 'numeric' });
  const month = PERSIAN_MONTHS[d.getMonth()];
  const year = d.toLocaleDateString('fa-IR', { year: 'numeric' });
  return { weekday, day, month, year };
}

function formatTehranTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function WelcomeSectionContent() {
  const user = useCurrentUser();
  const router = useRouter();
  const userRole = user?.role || 'USER';
  const role = roleStyles[userRole] ?? roleStyles.USER;
  const roleLabel = roleLabels[userRole] ?? 'کاربر';

  // Tehran time clock — kept client-side; SSR gets the static placeholder.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const t = window.setInterval(update, 30_000);
    return () => window.clearInterval(t);
  }, []);

  const date = now
    ? formatTehranDate(now)
    : { weekday: 'یکشنبه', day: '—', month: '—', year: '—' };
  const time = now ? formatTehranTime(now) : '--:--';

  // Time-of-day greeting in Persian (uses device-local hours — the same
  // clock the rest of the dashboard shows).
  const hour = now ? now.getHours() : 12;
  const timeOfDay =
    hour < 5
      ? 'بامداد بخیر'
      : hour < 12
        ? 'صبح بخیر'
        : hour < 17
          ? 'بعدازظهر بخیر'
          : hour < 20
            ? 'عصر بخیر'
            : 'شب بخیر';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
      {/* Top status row — full width on small, spans the upper edge on lg */}
      <div className="lg:col-span-12 flex items-center justify-between gap-3 flex-wrap">
        {/* Right side (RTL) — date chip */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium ring-1 backdrop-blur-md bg-white/[0.06] ring-white/15 text-white/80"
          aria-label={`امروز ${date.weekday} ${date.day} ${date.month} ${date.year}`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <time className="tabular-nums tracking-wide">
            {date.weekday}، {date.day} {date.month} {date.year}
          </time>
          <span aria-hidden="true" className="h-3 w-px bg-white/15" />
          <span className="tabular-nums text-white/70">{time}</span>
          <span className="text-white/50">تهران</span>
        </div>

        {/* Left side — role pill */}
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold ring-1 backdrop-blur-md',
            role.chip,
          )}
        >
          <HiOutlineShieldCheck className="w-3.5 h-3.5 opacity-90" />
          <span>{roleLabel}</span>
        </div>
      </div>

      {/* Main content: greeting + actions (col-span 8) */}
      <div className="lg:col-span-8 order-2 lg:order-1 flex flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight text-white">
            <span className="opacity-80 font-semibold">{timeOfDay}،</span>{' '}
            <span className="bg-gradient-to-l from-white via-cyan-100 to-emerald-100 bg-clip-text text-transparent">
              {user?.name ?? 'کاربر'}
            </span>
            <span className="opacity-80">.</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-white/70 max-w-xl leading-relaxed">
            یک نمای ۳۰ ثانیه‌ای از وبلاگ — آمار، انتشارهای اخیر و اقدام‌هایی که
            امروز ارزش انجام دارند.
          </p>
        </motion.div>

        {/* Primary CTA + secondary shortcuts */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="flex flex-wrap items-center gap-2.5"
        >
          <NewPostButton />
          <ShortcutButton
            icon={<HiOutlineDocumentText className="w-4 h-4" />}
            label="پست‌ها"
            onClick={() => router.push('/dashboard/posts')}
            hint="G P"
          />
          <ShortcutButton
            icon={<HiOutlineChartBar className="w-4 h-4" />}
            label="گزارش‌ها"
            onClick={() => router.push('/dashboard/reports')}
            hint="G R"
          />
          <ShortcutButton
            icon={<HiOutlineCalendarDays className="w-4 h-4" />}
            label="تقویم"
            onClick={() => router.push('/dashboard/posts?view=calendar')}
            hint="G C"
          />
        </motion.div>
      </div>

      {/* Avatar block (col-span 4) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        className="lg:col-span-4 order-1 lg:order-2 flex items-center justify-start lg:justify-end"
      >
        <button
          type="button"
          onClick={() => router.push('/dashboard/edit-profile')}
          aria-label="ویرایش پروفایل"
          className="group relative inline-flex items-center gap-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/10 hover:ring-white/20 backdrop-blur-md p-2 ps-4 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
        >
          <div className="text-end">
            <p className="text-sm font-bold text-white/90 leading-tight">
              {user?.name ?? 'کاربر'}
            </p>
            <p className={cn('text-[11px] font-medium mt-0.5', role.label)}>
              {roleLabel}
            </p>
          </div>
          <div className="relative">
            <Avatar
              imgUrl={(user?.profile?.avatar || user?.image) ?? undefined}
              userName={user?.name ?? undefined}
              sizeClass="h-12 w-12"
              containerClassName="rounded-xl ring-2 ring-white/15"
            />
            <span className="absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-[oklch(18%_0.045_260)] shadow-[0_0_10px_oklch(72%_0.14_165_/_0.65)]" />
          </div>
        </button>
      </motion.div>
    </div>
  );
}

interface ShortcutButtonProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}

function ShortcutButton({ icon, label, hint, onClick }: ShortcutButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 px-3.5 h-10 rounded-xl text-sm font-medium text-white/85 bg-white/[0.05] hover:bg-white/[0.10] ring-1 ring-white/10 hover:ring-white/20 backdrop-blur-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
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
