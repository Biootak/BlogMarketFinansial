import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import s from './obs.module.css';

interface ObsSectionProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** پوستهٔ استاندارد هر بلوک — تیتر، توضیح کوتاه، خط مویی، بدنه. بدون کارت. */
export function ObsSection({ icon: Icon, title, hint, actions, children }: ObsSectionProps) {
  return (
    <section className={s.section}>
      <header className={s.sectionHead}>
        <div className={s.sectionHeadText}>
          <h2 className={s.sectionTitle}>
            <Icon size={16} strokeWidth={1.5} aria-hidden />
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

/** حالت خالی — هرگز «چیزی نیست» خشک؛ همیشه می‌گوید چه چیزی اینجا می‌آید. */
export function ObsEmpty({ icon: Icon, title, hint }: ObsEmptyProps) {
  return (
    <div className={s.empty}>
      <Icon size={20} strokeWidth={1.5} className={s.emptyIcon} aria-hidden />
      <p className={s.emptyTitle}>{title}</p>
      <p className={s.emptyHint}>{hint}</p>
    </div>
  );
}
