import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ToneKey } from './format';
import s from './obs.module.css';

interface ObsSectionProps {
  id?: string;
  icon: LucideIcon;
  title: string;
  hint?: string;
  actions?: ReactNode;
  /** کلاس span از boards.module.css — جایگاه مدخل در گرید سالنامه. */
  className?: string;
  tone?: ToneKey;
  /** plain شمارهٔ مدخل را پنهان می‌کند؛ برای بلوک‌های فرعی. */
  variant?: 'entry' | 'plain';
  children: ReactNode;
}

/**
 * پوستهٔ یک مدخل سالنامه.
 *
 * سطح تیتر عمداً h3 است: RouteFrame در پوستهٔ داشبورد h1 را می‌سازد و هر
 * صفحه یک h2 برای عنوان تب دارد. قبلاً اینجا h2 بود که یعنی دو h2 هم‌سطح
 * روی یک صفحه و ساختار heading شکسته برای screen reader.
 */
export function ObsSection({
  id,
  icon: Icon,
  title,
  hint,
  actions,
  className,
  tone,
  variant = 'entry',
  children,
}: ObsSectionProps) {
  return (
    <section
      id={id}
      className={className ? `${s.section} ${className}` : s.section}
      data-tone={tone}
      data-variant={variant}
    >
      <header className={s.head}>
        <span className={s.index} aria-hidden="true" />
        <div className={s.headText}>
          <h3 className={s.title}>
            <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
            {title}
          </h3>
          {hint ? <p className={s.hint}>{hint}</p> : null}
        </div>
        {actions ? <div className={s.actions}>{actions}</div> : null}
      </header>
      <div className={s.body}>{children}</div>
    </section>
  );
}

interface ObsEmptyProps {
  icon: LucideIcon;
  title: string;
  hint: string;
}

/** حالت خالی — یک وضعیت واقعی، نه یک خطا. */
export function ObsEmpty({ icon: Icon, title, hint }: ObsEmptyProps) {
  return (
    <div className={s.empty}>
      <Icon size={20} strokeWidth={1.5} className={s.emptyIcon} aria-hidden="true" />
      <p className={s.emptyTitle}>{title}</p>
      <p className={s.emptyHint}>{hint}</p>
    </div>
  );
}
