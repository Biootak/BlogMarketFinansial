/**
 * Empty — site-level canonical empty state (2026).
 *
 * استفاده:
 *   <Empty />
 *   <Empty title="پستی یافت نشد" description="..." />
 *   <Empty icon={FileText} title="..." description="..." action={<Button>...</Button>} />
 *
 * قبلی: react-icons/MdFolder با inline Tailwind.
 * حال: lucide-react (canonical) + tokens + forward-compat API.
 */
import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface EmptyProps {
  /** آیکن اختیاری — پیش‌فرض Inbox (lucide) */
  icon?: LucideIcon;
  /** عنوان — پیش‌فرض «موردی یافت نشد» */
  title?: string;
  /** توضیح — پیش‌فرض «در حال حاضر هیچ موردی برای نمایش وجود ندارد» */
  description?: string;
  /** CTA اختیاری */
  action?: ReactNode;
  /** className سفارشی */
  className?: string;
}

export default function Empty({
  icon: Icon = Inbox,
  title = 'موردی یافت نشد',
  description = 'در حال حاضر هیچ موردی برای نمایش وجود ندارد',
  action,
  className = '',
}: EmptyProps = {}) {
  return (
    <output
      className={`flex flex-col items-center justify-center py-10 sm:py-14 text-center ${className}`.trim()}
    >
      <div
        className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl border border-dashed border-[color:var(--ds-border)] text-[color:var(--ds-text-muted)]"
        aria-hidden
      >
        <Icon className="size-6" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-[color:var(--ds-text-primary)]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[color:var(--ds-text-muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </output>
  );
}

/** re-export Link برای راحتی در سایت‌هایی که Link-based CTA می‌خواهند. */
export { Link };
