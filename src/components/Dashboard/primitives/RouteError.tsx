'use client';

/**
 * RouteError — canonical error boundary UI برای کل سایت (site + dashboard + exchange).
 * ============================================================================
 *
 * بهترین رویکرد 2026:
 *   - یک component واحد، همه context‌ها (site / dashboard / exchange)
 *   - error type detection (network / auth / not-found / server / unknown)
 *   - Sentry capture در همه محیط‌ها
 *   - فقط design system tokens — هیچ hex/rgb hardcode
 *   - RTL logical props
 *   - dev mode: error.message + digest نمایش داده می‌شود
 *   - variant="page" (center-screen) | variant="inline" (داخل section)
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
  ArrowRight,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import s from './RouteError.module.css';

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** نام بخش برای پیام خطا — مثلاً "گزارش‌ها" یا "پنل صرافی" */
  section?: string;
  /** لینک بازگشت. پیش‌فرض: "/" */
  backHref?: string;
  /** متن دکمه بازگشت. پیش‌فرض: "صفحه اصلی" */
  backLabel?: string;
  /** page = center-screen (پیش‌فرض) | inline = داخل section */
  variant?: 'page' | 'inline';
}

type ErrorKind = 'network' | 'auth' | 'notfound' | 'server' | 'unknown';

function detectKind(error: Error): ErrorKind {
  const m = (error.message ?? '').toLowerCase();
  if (m.includes('network') || m.includes('fetch') || m.includes('timeout') || m.includes('failed to fetch')) return 'network';
  if (m.includes('unauthorized') || m.includes('403') || m.includes('401')) return 'auth';
  if (m.includes('not found') || m.includes('404')) return 'notfound';
  if (m.includes('database') || m.includes('prisma') || m.includes('server') || m.includes('500')) return 'server';
  return 'unknown';
}

const KIND_META: Record<ErrorKind, { title: string; description: string; Icon: typeof AlertTriangle }> = {
  network: {
    title: 'خطای اتصال',
    description: 'ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.',
    Icon: WifiOff,
  },
  auth: {
    title: 'دسترسی غیرمجاز',
    description: 'شما دسترسی لازم برای این بخش را ندارید.',
    Icon: ShieldAlert,
  },
  notfound: {
    title: 'یافت نشد',
    description: 'صفحه یا منبع مورد نظر وجود ندارد.',
    Icon: AlertTriangle,
  },
  server: {
    title: 'خطای سرور',
    description: 'سرور موقتاً در دسترس نیست. لطفاً چند لحظه صبر کنید.',
    Icon: ServerCrash,
  },
  unknown: {
    title: 'خطای غیرمنتظره',
    description: 'مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.',
    Icon: AlertTriangle,
  },
};

export function RouteError({
  error,
  reset,
  section,
  backHref = '/',
  backLabel = 'صفحه اصلی',
  variant = 'page',
}: RouteErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const kind = detectKind(error);
  const { title, description, Icon } = KIND_META[kind];
  const heading = section ? `خطا در بارگذاری ${section}` : title;

  return (
    <div className={s.root} data-variant={variant} role="alert" dir="rtl">
      <div className={s.card}>
        <span className={s.iconWrap} data-kind={kind} aria-hidden>
          <Icon size={28} strokeWidth={1.75} />
        </span>

        <h2 className={s.title}>{heading}</h2>
        <p className={s.description}>{description}</p>

        {process.env.NODE_ENV === 'development' && (
          <p className={s.devInfo}>
            {error.message}
            {error.digest && <> &middot; digest: {error.digest}</>}
          </p>
        )}

        <div className={s.actions}>
          <button type="button" onClick={reset} className={s.retryBtn}>
            <RefreshCw size={14} strokeWidth={2} aria-hidden />
            تلاش مجدد
          </button>
          <Link href={backHref} className={s.backLink}>
            <ArrowRight size={14} strokeWidth={2} aria-hidden />
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
