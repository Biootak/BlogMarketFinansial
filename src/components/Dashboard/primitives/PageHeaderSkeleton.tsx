import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import s from './PageHeader.module.css';
import { PAGE_HEADERS, type PageHeaderRoute, type PageHeaderVariant } from './pageHeaders';

/**
 * PageHeaderSkeleton — Atlas 2026
 * ----------------------------------------------------------------------------
 * چرا لازم بود؟ هر `loading.tsx` سربرگ را دستی می‌ساخت: یکی `<PageHeader>` واقعی
 * با متن «در حال بارگذاری…» رندر می‌کرد، بقیه یک بلوک `h-[110px]` می‌گذاشتند.
 * نتیجه: هنگام hydrate صفحه می‌پرید چون ارتفاع اسکلتون با سربرگ واقعی یکی نبود.
 *
 * این کامپوننت عمداً همان `PageHeader.module.css` را مصرف می‌کند، پس padding،
 * gap، قاعدهٔ افقی و اندازهٔ نشانه دقیقاً برابر سربرگ واقعی است — بدون یک خط
 * CSS جدید و بدون امکان واگرایی در آینده.
 */

export interface PageHeaderSkeletonProps {
  /** پیش‌تنظیم مسیر؛ variant از همان جدول خوانده می‌شود. */
  route?: PageHeaderRoute;
  variant?: PageHeaderVariant;
  /** اگر سربرگ واقعی دکمه دارد، جای آن هم رزرو شود. */
  withActions?: boolean;
  /** آیا سربرگ واقعی توضیح دارد؟ */
  withDescription?: boolean;
  className?: string;
}

export function PageHeaderSkeleton({
  route,
  variant,
  withActions = false,
  withDescription,
  className,
}: PageHeaderSkeletonProps) {
  const preset = route ? PAGE_HEADERS[route] : undefined;
  const v: PageHeaderVariant = variant ?? preset?.variant ?? 'default';
  const showDescription = withDescription ?? Boolean(preset?.description);

  // ── strip ────────────────────────────────────────────────────────────────
  if (v === 'strip') {
    return (
      <div className={cn(s.strip, className)} aria-hidden data-page-header-skeleton="strip">
        <Skeleton className="h-3 w-36" />
        <div className={s.stripRow}>
          <Skeleton className={cn(s.stripIcon, 'rounded-[10px]')} />
          <Skeleton className="h-4 w-36" />
          {withActions && (
            <div className={s.stripActions}>
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          )}
        </div>
        {showDescription && <Skeleton className="h-3 w-64" />}
      </div>
    );
  }

  // ── minimal ──────────────────────────────────────────────────────────────
  if (v === 'minimal') {
    return (
      <div className={cn(s.minimal, className)} aria-hidden data-page-header-skeleton="minimal">
        <Skeleton className="h-3 w-24" />
        <div className={s.minimalRow}>
          <Skeleton className={cn(s.minimalIcon, 'rounded-[12px]')} />
          <Skeleton className="h-5 w-48" />
          {withActions && (
            <div className={s.minimalActions}>
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
          )}
        </div>
        {showDescription && <Skeleton className="h-4 w-full max-w-[34rem]" />}
      </div>
    );
  }

  // ── compact ──────────────────────────────────────────────────────────────
  if (v === 'compact') {
    return (
      <div className={cn(s.compact, className)} aria-hidden data-page-header-skeleton="compact">
        <div className={s.compactTop}>
          <div className={s.metaRow}>
            <Skeleton className="h-1.5 w-1.5 rounded-full" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className={s.compactRow}>
            <Skeleton className={cn(s.compactIcon, 'rounded-[12px]')} />
            <Skeleton className="h-6 w-56" />
          </div>
          {showDescription && <Skeleton className="h-4 w-full max-w-[34rem]" />}
        </div>
        {withActions && (
          <div className={s.actions}>
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        )}
      </div>
    );
  }

  // ── default ──────────────────────────────────────────────────────────────
  return (
    <div className={cn(s.header, className)} aria-hidden data-page-header-skeleton="default">
      <div className={s.body}>
        <div className={s.metaRow}>
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <Skeleton className="h-3 w-44" />
        </div>
        <div className={s.titleRow}>
          <Skeleton className={cn(s.iconWrap, 'rounded-[14px]')} />
          <Skeleton className="h-7 w-64" />
        </div>
        {showDescription && <Skeleton className="h-4 w-full max-w-[38rem]" />}
      </div>
      {withActions && (
        <div className={s.actions}>
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      )}
    </div>
  );
}
