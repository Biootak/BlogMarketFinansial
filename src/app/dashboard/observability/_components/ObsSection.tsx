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
  /** برای جاگذاری در گرید boards — کلاس span از boards.module.css می‌آید. */
  className?: string;
  tone?: ToneKey;
  /** plain شمارهٔ مدخل را پنهان می‌کند؛ برای بلوک‌های فرعی زیرمسیرها. */
  variant?: 'entry' | 'plain';
  children: ReactNode;
}

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
      <header className={s.sectionHead}>
        <span className={s.sectionIndex} aria-hidden="true" />
        <div className={s.sectionHeadText}>
          <h2 className={s.sectionTitle}>
            <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
            {title}
          </h2>
          {hint ? <p className={s.sectionHint}>{hint}</p> : null}
        </div>
        {actions ? <div className={s.sectionActions}>{actions}</div> : null}
      </header>
      <div className={s.sectionBody}>{children}</div>
    </section>
  );
}

interface ObsEmptyProps {
  icon: LucideIcon;
  title: string;
  hint: string;
}

export function ObsEmpty({ icon: Icon, title, hint }: ObsEmptyProps) {
  return (
    <div className={s.empty}>
      <Icon size={20} strokeWidth={1.5} className={s.emptyIcon} aria-hidden="true" />
      <p className={s.emptyTitle}>{title}</p>
      <p className={s.emptyHint}>{hint}</p>
    </div>
  );
}
