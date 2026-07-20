import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface SectionHeaderProps {
  /** آیکون کوچک (معمولاً lucide-react). 16×16 در سایز پیش‌فرض */
  icon?: ReactNode;
  title: string;
  /** اختیاری — توضیح یک‌خطی. اگه ندهیم فقط عنوان می‌مونه */
  subtitle?: string;
  /** لینک «مشاهده همه» در سمت چپ (RTL end) */
  viewAll?: { label: string; href: string };
  /** رنگ آیکون + container — از توکن‌های پروژه */
  accent?: 'primary' | 'amber' | 'emerald' | 'rose';
  className?: string;
  /** اگه true، می‌تونی children اضافه کنی (مثلاً فیلتر chips) */
  children?: ReactNode;
}

const ACCENT_BG: Record<NonNullable<SectionHeaderProps['accent']>, string> = {
  primary: 'bg-primary-500/10 text-primary-500 dark:text-primary-300',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export function SectionHeader({
  icon,
  title,
  subtitle,
  viewAll,
  accent = 'primary',
  className,
  children,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3 mb-4 sm:mb-5', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div
            className={cn(
              'flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl shrink-0',
              'border border-[color:var(--hairline)]',
              ACCENT_BG[accent],
            )}
            aria-hidden
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white text-balance leading-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[11.5px] sm:text-[13px] text-neutral-500 dark:text-neutral-400 font-vazirmatn line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {children}
        {viewAll && (
          <Link
            href={viewAll.href}
            className={cn(
              'group/va inline-flex items-center gap-1.5',
              'text-[11.5px] sm:text-xs font-semibold',
              'text-primary-500 dark:text-primary-300',
              'hover:gap-2 transition-all duration-200',
            )}
          >
            <span>{viewAll.label}</span>
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover/va:-translate-x-0.5"
              strokeWidth={2.25}
              aria-hidden
            />
          </Link>
        )}
      </div>
    </div>
  );
}

export default SectionHeader;
