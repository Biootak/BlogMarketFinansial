'use client';

/**
 * SettingsSurfaceCard — یک کانتینر برای section های settings.
 *
 * این wrapper استایل یکپارچه (border-radius، padding، gradient cover)
 * را برای هر section اعمال می‌کند. شامل:
 *   - header با icon chip + title + description + actions
 *   - body (children)
 *   - footer (اختیاری)
 *
 * این کامپوننت برای استفاده در /exchange/profile و /exchange/settings
 * است. الگو از Vercel/Stripe: هر section یک "panel" مستقل است.
 */

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import s from './SettingsSurfaceCard.module.css';

interface Props {
  /** ID برای anchor linking */
  id?: string;
  /** عنوان فارسی */
  title: string;
  /** توضیح کوتاه */
  description?: string;
  /** icon lucide */
  icon?: LucideIcon;
  /** tone رنگ icon chip */
  tone?: 'accent' | 'info' | 'warn' | 'violet' | 'gold' | 'danger';
  /** badge کنار title (مثل "پیشنهادی") */
  badge?: { label: string; tone?: 'neutral' | 'warn' | 'success' | 'info' };
  /** اکشن‌های سمت چپ (معمولاً link یا count) */
  headerActions?: ReactNode;
  children: ReactNode;
  /** footer محتوا — معمولاً برای hint یا CTA */
  footer?: ReactNode;
  className?: string;
}

export function SettingsSurfaceCard({
  id,
  title,
  description,
  icon: Icon,
  tone = 'accent',
  badge,
  headerActions,
  children,
  footer,
  className,
}: Props) {
  return (
    <section
      id={id}
      className={cn(s.card, className)}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <header className={s.head}>
        <div className={s.headLeft}>
          {Icon && (
            <span className={cn(s.iconChip, s[`tone_${tone}`])} aria-hidden>
              <Icon size={15} strokeWidth={1.85} />
            </span>
          )}
          <div className={s.headText}>
            <h2 id={id ? `${id}-title` : undefined} className={s.title}>
              {title}
              {badge && (
                <span className={cn(s.badge, s[`badge_${badge.tone ?? 'neutral'}`])}>
                  {badge.label}
                </span>
              )}
            </h2>
            {description && <p className={s.desc}>{description}</p>}
          </div>
        </div>
        {headerActions && <div className={s.headRight}>{headerActions}</div>}
      </header>

      <div className={s.body}>{children}</div>

      {footer && <div className={s.footer}>{footer}</div>}
    </section>
  );
}
