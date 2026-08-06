import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ToneKey } from './format';
import s from './obs.module.css';

interface ObsSectionProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  actions?: ReactNode;
  /** برای جاگذاری در گرید boards — کلاس span از boards.module.css می‌آید. */
  className?: string;
  tone?: ToneKey;
  children: ReactNode;
}

/** پوستهٔ استاندارد هر بلوک — تیتر، توضیح کوتاه، خط مویی، بدنه. بدون کارت. */
export function ObsSection({
  icon: Icon,
  title,
  hint,
  actions,
  className,
  tone,
  children,
}: ObsSectionProps) {
  return (
    <section className={className ? `${s.section} ${className}` : s.section} data-tone={tone}>
      <header className={s.sectionHead}>
        <div className={s.sectionHeadText}>
          <h2 className={s.sectionTitle}>
            <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
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

/** حالت خالی — هرگز «چیزی نیست» خشک؛ همیشه می‌گوید چه چیزی قرار است اینجا بیاید. */
export function ObsEmpty({ icon: Icon, title, hint }: ObsEmptyProps) {
  return (
    <div className={s.empty}>
      <Icon size={20} strokeWidth={1.5} className={s.emptyIcon} aria-hidden="true" />
      <p className={s.emptyTitle}>{title}</p>
      <p className={s.emptyHint}>{hint}</p>
    </div>
  );
}
