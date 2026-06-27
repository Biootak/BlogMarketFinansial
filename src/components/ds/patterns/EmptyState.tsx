import { Inbox } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}

/**
 * EmptyState — حالت خالی برای لیست‌ها.
 * - icon پیش‌فرض: Inbox (lucide)
 * - اختیاری: CTA در پایین
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`ds-empty ${className}`.trim()} role="status">
      <div className="ds-empty__icon" aria-hidden>
        {icon ?? <Inbox className="w-12 h-12" strokeWidth={1.5} />}
      </div>
      <h3 className="ds-empty__title">{title}</h3>
      {description ? <p className="ds-empty__description">{description}</p> : null}
      {action ? (
        <Link href={action.href} className="ds-empty__action">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
