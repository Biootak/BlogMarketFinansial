'use client';

/**
 * RouteError — canonical error boundary UI (million-dollar premium)
 * ============================================================================
 *
 * Design intent (approved mockup):
 *   - Glass card centered in the dashboard shell (Linear × Vercel)
 *   - Medallion icon with rotating dashed ring + pulsing glow
 *   - Ambient gradient orbs + fine grid texture (no AI-slop particles)
 *   - Suggested destination cards (2×2 grid, context-aware)
 *   - Tone-driven accent colors
 *   - Stagger entrance animation
 *   - error type detection (network / auth / not-found / server / unknown)
 *   - Sentry capture در همه محیط‌ها
 *   - فقط design system tokens — هیچ hex/rgb hardcode
 *   - RTL logical props
 *   - dev mode: error.message + digest نمایش داده می‌شود
 *   - variant="page" (center-screen card) | variant="inline" (داخل section)
 *
 * استفاده در error.tsx:
 *   export default function MyError({ error, reset }) {
 *     return <RouteError error={error} reset={reset} section="نام بخش" />;
 *   }
 * ============================================================================
 */

import * as Sentry from '@sentry/nextjs';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Home,
  LayoutDashboard,
  LogIn,
  type LucideIcon,
  RefreshCw,
  Search,
  ServerCrash,
  ShieldAlert,
  Store,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';

import { useStaggerEntrance } from '@/hooks/useStaggerEntrance';
import s from './RouteError.module.css';

/* ─── Types ──────────────────────────────────────────────────────────── */

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** نام بخش برای پیام خطا — مثلا‌ً "گزارش‌ها" یا "پنل صرافی" */
  section?: string;
  /** لینک بازگشت. پیش‌فرض: "/" */
  backHref?: string;
  /** متن دکمه بازگشت. پیش‌فرض: "صفحه اصلی" */
  backLabel?: string;
  /** page = center-screen card (پیش‌فرض) | inline = داخل section */
  variant?: 'page' | 'inline';
  /** کارت‌های مقصد پیشنهادی (شبکهٔ ۲×۲). پیش‌فرض بر اساس نوع خطا ساخته می‌شود. */
  suggestions?: SuggestItem[];
  /** ثبت خطا در Sentry — پیش‌فرض true. برای پیش‌نمایش/صفحه‌های دمو false بدهید. */
  reportToSentry?: boolean;
}

/** یک کارت مقصد پیشنهادی در شبکهٔ ۲×۲. */
export interface SuggestItem {
  href: string;
  label: string;
  sub: string;
  icon?: LucideIcon;
}

type ErrorKind = 'network' | 'auth' | 'notfound' | 'server' | 'unknown';

function detectKind(error: Error): ErrorKind {
  const m = (error.message ?? '').toLowerCase();
  if (
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('timeout') ||
    m.includes('failed to fetch')
  )
    return 'network';
  if (m.includes('unauthorized') || m.includes('403') || m.includes('401')) return 'auth';
  if (m.includes('not found') || m.includes('404')) return 'notfound';
  if (m.includes('database') || m.includes('prisma') || m.includes('server') || m.includes('500'))
    return 'server';
  return 'unknown';
}

const KIND_TONE: Record<ErrorKind, string> = {
  network: 'indigo',
  auth: 'rose',
  notfound: 'violet',
  server: 'amber',
  unknown: 'emerald',
};

const KIND_META: Record<ErrorKind, { eyebrow: string; title: string; description: string }> = {
  network: {
    eyebrow: 'خطای اتصال',
    title: 'ارتباط با سرور برقرار نشد',
    description: 'اینترنت خود را بررسی کنید و دوباره تلاش کنید.',
  },
  auth: {
    eyebrow: 'دسترسی غیرمجاز',
    title: 'دسترسی شما مجاز نیست',
    description: 'شما اجازهٔ دسترسی به این بخش را ندارید. ممکن است نقش حساب شما کافی نباشد.',
  },
  notfound: {
    eyebrow: 'یافت نشد',
    title: 'این منبع وجود ندارد',
    description: 'صفحه یا داده‌ای که دنبال آن می‌گردید یافت نشد.',
  },
  server: {
    eyebrow: 'خطای سرور',
    title: 'سرور موقتاُ در دسترس نیست',
    description: 'مشکلی فنی پیش آمده. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.',
  },
  unknown: {
    eyebrow: 'خطای غیرمنتظره',
    title: 'مشکلی پیش آمده است',
    description: 'خطایی رخ داده که پیش‌بینی نشده بود. لطفاً دوباره تلاش کنید.',
  },
};

/** آیکون هر نوع خطا برای داخل مدالیون. */
const KIND_ICON: Record<ErrorKind, LucideIcon> = {
  network: WifiOff,
  auth: ShieldAlert,
  notfound: Search,
  server: ServerCrash,
  unknown: AlertTriangle,
};

/* ─── Suggested destinations ─────────────────────────────────────── */

function defaultSuggestions(kind: ErrorKind, backHref: string, backLabel: string): SuggestItem[] {
  const items: SuggestItem[] = [];
  if (backHref && backHref !== '/') {
    items.push({ href: backHref, label: backLabel, sub: 'بازگشت به بخش قبلی', icon: ArrowRight });
  }
  items.push({ href: '/', label: 'صفحه اصلی', sub: 'شروع دوباره از سایت', icon: Home });
  items.push({ href: '/dashboard', label: 'داشبورد', sub: 'پنل مدیریت', icon: LayoutDashboard });
  if (kind === 'auth') {
    items.push({ href: '/auth', label: 'ورود', sub: 'وارد حساب کاربری شوید', icon: LogIn });
  } else {
    items.push({ href: '/exchange', label: 'صرافی', sub: 'پنل صرافی', icon: Store });
  }
  return items.slice(0, 4);
}

/* ─── Component ──────────────────────────────────────────────────────── */

export function RouteError({
  error,
  reset,
  section,
  backHref = '/',
  backLabel = 'صفحه اصلی',
  variant = 'page',
  suggestions,
  reportToSentry = true,
}: RouteErrorProps) {
  useEffect(() => {
    if (reportToSentry) Sentry.captureException(error);
  }, [error, reportToSentry]);

  const kind = detectKind(error);
  const tone = KIND_TONE[kind];
  const { eyebrow, title, description } = KIND_META[kind];
  const heading = section ? `خطا در بارگذاری ${section}` : title;
  const suggestItems = suggestions ?? defaultSuggestions(kind, backHref, backLabel);
  // dedupe by href — backHref ممکن است با یکی از پیشنهادهای پیش‌فرض یکسان باشد
  // (مثلاً backHref="/dashboard") و key تکراری در لیست کارت‌ها می‌سازد.
  const seenHrefs = new Set<string>();
  const uniqueSuggestItems = suggestItems.filter((item) => {
    if (seenHrefs.has(item.href)) return false;
    seenHrefs.add(item.href);
    return true;
  });
  const Icon = KIND_ICON[kind];
  const root = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useStaggerEntrance(root);

  return (
    <div
      ref={root}
      className={s.root}
      data-variant={variant}
      data-tone={tone}
      dir="rtl"
      role="alert"
      aria-labelledby={titleId}
    >
      {/* ── Ambient orbs + grid ─────────────────────────────────── */}
      <div className={s.ambients} aria-hidden>
        <span className={`${s.orb} ${s.orbA}`} />
        <span className={`${s.orb} ${s.orbB}`} />
        <span className={`${s.orb} ${s.orbC}`} />
      </div>
      <div className={s.grid} aria-hidden />

      {/* ── Glass card ──────────────────────────────────────────── */}
      <div className={s.card}>
        <div className={s.sheen} aria-hidden />

        {/* Medallion icon */}
        <div data-stagger className={s.medallion} aria-hidden>
          <Icon size={34} strokeWidth={1.9} />
        </div>

        {/* Eyebrow badge */}
        <div data-stagger className={s.headBlock}>
          <span className={s.eyebrow}>
            <span className={s.eyebrowDot} aria-hidden />
            {eyebrow}
          </span>
          <h2 id={titleId} className={s.title}>
            {heading}
          </h2>
          <p className={s.lead}>{description}</p>

          {process.env.NODE_ENV === 'development' && (
            <code className={s.devInfo} dir="ltr">
              <span className={s.devTag}>{'DEV'}</span>
              {error.message}
              {error.digest && <> &middot; digest: {error.digest}</>}
            </code>
          )}
        </div>

        {/* Actions */}
        <div data-stagger className={s.actions}>
          <button type="button" onClick={reset} className={s.retryBtn}>
            <RefreshCw size={15} strokeWidth={2.25} aria-hidden />
            تلاش مجدد
          </button>
          <Link href={backHref} className={s.backLink}>
            <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
            {backLabel}
          </Link>
        </div>

        {/* Suggested destination cards (2×2) */}
        {uniqueSuggestItems.length > 0 && (
          <div data-stagger className={s.suggestions}>
            {uniqueSuggestItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={s.suggestCard}>
                  <span className={s.suggestIcon} aria-hidden>
                    {ItemIcon && <ItemIcon size={17} strokeWidth={1.9} />}
                  </span>
                  <span className={s.suggestMain}>
                    <span className={s.suggestLabel}>{item.label}</span>
                    <span className={s.suggestSub}>{item.sub}</span>
                  </span>
                  <ArrowLeft size={15} strokeWidth={1.9} className={s.suggestArrow} aria-hidden />
                </Link>
              );
            })}
          </div>
        )}

        <div data-stagger className={s.foot}>
          اگر مشکل ادامه داشت، وضعیت سرویس را در <code>مرکز پایش</code> بررسی کنید.
        </div>
      </div>
    </div>
  );
}
