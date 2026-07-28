/**
 * SettingsField — یک label + control + hint + (اختیاری) unit
 *
 * این کامپوننت برای استفاده در فرم‌های settings است. برخلاف FormField
 * که خودش کل child را wrap می‌کند، SettingsField فقط label/hint/unit
 * را handle می‌کند و control را به‌صورت children دریافت می‌کند.
 *
 * مزیت: انعطاف بیشتر — می‌توان هر نوع کنترلی (input, select, switch
 * row, two-col inputs) داخلش گذاشت.
 */

import type { ReactNode } from 'react';
import s from './SettingsField.module.css';

interface Props {
  label: string;
  hint?: ReactNode;
  /** badge کوچک کنار label (مثل "الزامی" یا "پیشنهادی") */
  tag?: { label: string; tone?: 'required' | 'optional' | 'recommended' };
  /** واحد کنار مقدار (مثل "٪" یا "افغانی") */
  unit?: string;
  /** متن راهنمای اضافی زیر input */
  footer?: ReactNode;
  /** وقتی horizontal باشد، label در سمت راست و input در سمت چپ */
  layout?: 'stacked' | 'inline';
  /** عرض فیلد (برای grid spanning) */
  span?: 1 | 2 | 'full';
  children: ReactNode;
  htmlFor?: string;
}

export function SettingsField({
  label,
  hint,
  tag,
  unit,
  footer,
  layout = 'stacked',
  span = 1,
  children,
  htmlFor,
}: Props) {
  return (
    <div
      className={`${s.field} ${s[`span_${span}`]} ${layout === 'inline' ? s.inline : ''}`}
    >
      <div className={s.labelRow}>
        <label className={s.label} htmlFor={htmlFor}>
          {label}
          {tag && <span className={`${s.tag} ${s[`tag_${tag.tone ?? 'optional'}`]}`}>{tag.label}</span>}
        </label>
        {hint && <span className={s.hint}>{hint}</span>}
      </div>
      <div className={s.control}>
        {children}
        {unit && <span className={s.unit}>{unit}</span>}
      </div>
      {footer && <div className={s.footer}>{footer}</div>}
    </div>
  );
}
