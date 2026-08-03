'use client';

import { cn } from '@/lib/utils';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import s from './PlatformHub.module.css';

export interface HubHeaderProps {
  title: string;
  subtitle?: string;
  /** back link href (optional) */
  backHref?: string;
  backLabel?: string;
  /** icon next to title */
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
  /** visual variant — dark for forensics/DLQ */
  variant?: 'default' | 'dark';
}

/**
 * HubHeader — compact header for sub-routes (detail pages, list pages).
 * Smaller than HubShell. Used when a sub-route doesn't need a full hub.
 */
export function HubHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'بازگشت',
  icon: Icon,
  actions,
  className,
  variant = 'default',
}: HubHeaderProps) {
  return (
    <div
      className={cn(s.hubHeaderCompact, variant === 'dark' && s.hubHeaderCompactDark, className)}
    >
      {backHref ? (
        <Link href={backHref} className={s.hubBack} aria-label={backLabel}>
          <ChevronRight size={16} aria-hidden />
          <span>{backLabel}</span>
        </Link>
      ) : null}
      <div className={s.hubHeaderCompactMain}>
        {Icon ? (
          <span className={s.hubHeaderIcon}>
            <Icon size={20} aria-hidden />
          </span>
        ) : null}
        <div>
          <h1 className={s.hubHeaderCompactTitle}>{title}</h1>
          {subtitle ? <p className={s.hubHeaderCompactSubtitle}>{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className={s.hubHeaderCompactActions}>{actions}</div> : null}
    </div>
  );
}
