/**
 * @file AuthorsCTA
 * @description Editorial-style CTA strip at the bottom of the author hub.
 * Pure server component.
 */
import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, FileText, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AuthorsCTAProps {
  className?: string;
}

const AuthorsCTA: React.FC<AuthorsCTAProps> = ({ className }) => {
  return (
    <section
      dir="rtl"
      className={cn(
        'relative overflow-hidden rounded-3xl sm:rounded-[2.5rem]',
        'bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900',
        'dark:from-primary-800 dark:via-primary-900 dark:to-neutral-950',
        'p-6 sm:p-8 lg:p-10',
        'text-white',
        className,
      )}
      aria-label="پیشنهاد ویژه"
    >
      <span
        aria-hidden
        className="absolute -top-20 -end-20 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, oklch(72% 0.13 70), transparent 70%)',
        }}
      />
      <span
        aria-hidden
        className="absolute -bottom-20 -start-20 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, oklch(65% 0.10 200), transparent 70%)',
        }}
      />
      <div className="relative grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1 text-[11px] sm:text-xs font-medium">
            <Sparkles className="h-3 w-3 text-amber-300" strokeWidth={2.5} aria-hidden />
            به جمع ما بپیوندید
          </span>
          <h2 className="mt-3 sm:mt-4 text-xl sm:text-2xl lg:text-3xl font-black leading-tight text-balance">
            صدای شما در <span className="text-amber-300">بازارهای مالی</span> شنیده می‌شود
          </h2>
          <p className="mt-2.5 text-sm sm:text-[15px] text-white/80 max-w-2xl leading-relaxed">
            اگر تحلیل‌گر، تریدر یا روزنامه‌نگار بازارهای مالی هستید، پلتفرم ما
            بستر مناسبی برای انتشار دیدگاه‌هایتان است. با تیم تحریریه همکاری کنید
            و مقالات‌تان به دست هزاران خواننده‌ی حرفه‌ای برسد.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 sm:gap-3">
          <Link
            href="/contact"
            className={cn(
              'group inline-flex items-center justify-center gap-2',
              'rounded-full bg-white text-neutral-900',
              'px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold',
              'hover:bg-amber-300 transition-colors duration-200',
            )}
          >
            <Compass className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            ارسال رزومه
            <ArrowLeft
              className="h-3.5 w-3.5 rtl:rotate-180 transition-transform duration-200 group-hover:-translate-x-0.5"
              strokeWidth={2.5}
              aria-hidden
            />
          </Link>
          <Link
            href="/archive"
            className={cn(
              'inline-flex items-center justify-center gap-2',
              'rounded-full border border-white/20 text-white/90',
              'px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold',
              'hover:bg-white/10 transition-colors duration-200',
            )}
          >
            <FileText className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            مشاهده آرشیو مقالات
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AuthorsCTA;
