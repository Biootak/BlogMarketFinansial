/**
 * @file AuthorsHero
 * @description Premium editorial hero for the /authors hub. Pure server
 * component. Uses the new author tokens (aurora, hairline, halo).
 */
import * as React from 'react';
import { Sparkles, Users, BookOpen, Star } from 'lucide-react';
import AuthorAvatar from './primitives/AuthorAvatar';
import { cn, toPersianNumber } from '@/lib/utils';

export interface AuthorsHeroProps {
  totalAuthors: number;
  totalPosts: number;
  /** Top 3 authors shown in the hero collage (sorted by post count) */
  topAuthors: Array<{
    id: string;
    name: string | null;
    image?: string | null;
    profile?: { avatar?: string | null; jobName?: string | null } | null;
    _count?: { posts?: number };
  }>;
  className?: string;
}

const AuthorsHero: React.FC<AuthorsHeroProps> = ({
  totalAuthors,
  totalPosts,
  topAuthors,
  className,
}) => {
  const stats = [
    { icon: Users, value: totalAuthors, label: 'نویسنده فعال' },
    { icon: BookOpen, value: totalPosts, label: 'مقاله منتشر شده' },
    { icon: Star, value: '۱۰+', label: 'سال تجربه' },
  ];

  return (
    <section
      dir="rtl"
      className={cn(
        'relative overflow-hidden',
        'rounded-3xl sm:rounded-[2.5rem]',
        'border border-[color:var(--hairline)]',
        'bg-gradient-to-br from-white via-white to-primary-50/40',
        'dark:from-neutral-900 dark:via-neutral-900 dark:to-primary-900/20',
        'px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16',
        className,
      )}
    >
      {/* aurora layers — pure CSS, no JS */}
      <span aria-hidden className="author-aurora author-aurora--a" />
      <span aria-hidden className="author-aurora author-aurora--b" />
      {/* hairline grid */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-[0.35] dark:opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--hairline) 1px, transparent 1px), linear-gradient(to bottom, var(--hairline) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage:
            'radial-gradient(ellipse at center, black 35%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 35%, transparent 75%)',
        }}
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-12 items-center">
        {/* copy column */}
        <div className="text-center lg:text-start">
          <span className="author-chip">
            <Sparkles className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            انجمن نویسندگان
          </span>

          <h1 className="mt-4 sm:mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] text-neutral-900 dark:text-neutral-50 text-balance">
            ذهن‌هایی که <span className="bg-gradient-to-r from-primary-500 via-primary-400 to-amber-400 bg-clip-text text-transparent">روایت می‌کنند</span>
          </h1>

          <p className="mt-4 sm:mt-5 max-w-xl mx-auto lg:mx-0 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 text-balance">
            با تحلیل‌گران، معامله‌گران و روزنامه‌نگارانی آشنا شوید که پشت
            هر مقاله در بازارهای مالی، یک داستان، یک استراتژی و یک نگاه تازه
            نهفته است.
          </p>

          <dl className="mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-3 max-w-xl mx-auto lg:mx-0">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const display =
                typeof stat.value === 'number'
                  ? toPersianNumber(stat.value)
                  : stat.value;
              return (
                <div
                  key={stat.label}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl',
                    'bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm',
                    'border border-[color:var(--hairline)]',
                    'px-2.5 py-3 sm:px-4 sm:py-4',
                  )}
                >
                  <Icon
                    className="h-4 w-4 text-primary-500 dark:text-primary-300"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  <dt className="author-num text-base sm:text-xl font-black text-neutral-900 dark:text-neutral-50">
                    {display}
                  </dt>
                  <dd className="text-[10.5px] sm:text-[11.5px] text-neutral-500 dark:text-neutral-400 leading-tight text-center">
                    {stat.label}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        {/* collage column */}
        <div className="relative h-[260px] sm:h-[320px] lg:h-[380px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              aria-hidden
              className="block h-44 w-44 sm:h-56 sm:w-56 lg:h-64 lg:w-64 rounded-full"
              style={{
                background:
                  'conic-gradient(from 0deg, oklch(65% 0.10 200 / 0.18), oklch(72% 0.13 70 / 0.14), oklch(65% 0.10 200 / 0.0), oklch(72% 0.13 70 / 0.14), oklch(65% 0.10 200 / 0.18))',
                filter: 'blur(20px)',
              }}
            />
          </div>

          {topAuthors.slice(0, 3).map((author, i) => {
            const positions = [
              'top-0 start-1/2 -translate-x-1/2 z-30',
              'bottom-2 end-2 z-20',
              'bottom-2 start-2 z-20',
            ];
            return (
              <div
                key={author.id}
                className={cn('absolute', positions[i])}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="anim-fade-in-up">
                  <AuthorAvatar
                    size="2xl"
                    imgUrl={author.profile?.avatar ?? author.image ?? null}
                    userName={author.name}
                    halo
                    showStatus={i === 0}
                    containerClassName="rounded-full"
                  />
                  <div className="mt-2 text-center">
                    <p className="text-[11px] sm:text-xs font-bold text-neutral-800 dark:text-neutral-100 line-clamp-1 max-w-[8rem] mx-auto">
                      {author.name}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 max-w-[8rem] mx-auto">
                      {author.profile?.jobName ?? 'نویسنده'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AuthorsHero;
