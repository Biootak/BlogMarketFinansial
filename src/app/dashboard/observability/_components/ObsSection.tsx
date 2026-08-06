import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { toFa, type ToneKey } from './format';
import s from './obs.module.css';

interface ObsSectionProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  actions?: ReactNode;
  /** شمارهٔ گاتر — حس «سازِ اندازه‌گیری» و مرجع گفت‌وگو («بلوک ۰۳ را ببین»). */
  index?: number;
  /** برای جاگذاری در گرید boards — کلاس span از boards.module.css می‌آید. */
  className?: string;
  tone?: ToneKey;
  children: ReactNode;
}

const pad = (value: number): string => toFa(value < 10 ? `0${value}` : String(value));

/**
 * پوستهٔ استاندارد هر بلوک.
 *
 * بدون کارت و بدون سایه: شمارهٔ گاتر + تیتر + خط مویی + بدنه. دو براکت گوشه
 * (۱px) در hover/focus-within باز می‌شوند — همان جزئیاتِ «سازِ دقیق» که
 * بدون افزودن حتی یک گره DOM ساخته می‌شود (فقط pseudo-element و transform).
 */
export function ObsSection({
  icon: Icon,
  title,
  hint,
  actions,
  index,
  className,
  tone,
  children,
}: ObsSectionProps) {
  return (
    <section className={className ? `${s.section} ${className}` : s.section} data-tone={tone}>
      <header className={s.sectionHead}>
        {typeof index === 'number' ? (
          <span className={s.mark} aria-hidden="true">
            {pad(index)}
          </span>
        ) : null}

        <div className={s.sectionHeadText}>
          <h2 className={s.sectionTitle}>
            <Icon size={16} strokeWidth={1.5} className={s.sectionIcon} aria-hidden="true" />
            <span>{title}</span>
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
      <span className={s.emptyIcon} aria-hidden="true">
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <p className={s.emptyTitle}>{title}</p>
      <p className={s.emptyHint}>{hint}</p>
    </div>
  );
}
