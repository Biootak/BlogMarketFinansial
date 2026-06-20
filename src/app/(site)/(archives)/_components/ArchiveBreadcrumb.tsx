import {
  ChevronLeft,
  Home,
  ArrowUpRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import {
  HiOutlineDocumentText,
  HiOutlineRectangleStack,
  HiOutlineTag,
  HiSparkles,
} from 'react-icons/hi2';

export type Crumb = {
  href: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  /** active page (آخرین) */
  current?: boolean;
  /** accent color */
  accent?: 'brand' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate';
};

type Props = {
  crumbs: Crumb[];
  /** breadcrumb کنار (مثلاً شمارنده‌ی مقالات) */
  trailing?: React.ReactNode;
  /** شاخص کوچک کنار (مثل "X مقاله") */
  badge?: { label: string; icon?: React.ReactNode };
};

function CrumbIcon({ Icon, className }: { Icon?: Crumb['icon']; className?: string }) {
  if (!Icon) return null;
  return <Icon className={className ?? 'w-3.5 h-3.5'} />;
}

const ACCENT_BG: Record<NonNullable<Crumb['accent']>, string> = {
  brand: 'arc-crumb--brand',
  violet: 'arc-crumb--violet',
  emerald: 'arc-crumb--emerald',
  amber: 'arc-crumb--amber',
  rose: 'arc-crumb--rose',
  slate: 'arc-crumb--slate',
};

export default function ArchiveBreadcrumb({ crumbs, trailing, badge }: Props) {
  return (
    <header className="arc-breadcrumb-header" aria-label="مسیر">
      <span className="arc-breadcrumb-header__glow arc-breadcrumb-header__glow--a" aria-hidden />
      <span className="arc-breadcrumb-header__glow arc-breadcrumb-header__glow--b" aria-hidden />
      <span className="arc-breadcrumb-header__line" aria-hidden />

      <div className="container">
        <div className="arc-breadcrumb-header__inner">
          {/* ============ Crumbs (right side, RTL) ============ */}
          <nav className="arc-breadcrumb" aria-label="مسیر ناوبری">
            <ol className="arc-breadcrumb__list">
              {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1;
                const isCurrent = c.current ?? isLast;
                const accentClass = c.accent ? ACCENT_BG[c.accent] : '';
                return (
                  <li key={`${c.href}-${i}`} className="arc-breadcrumb__item">
                    {i > 0 ? (
                      <span className="arc-breadcrumb__sep" aria-hidden>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </span>
                    ) : null}
                    {isCurrent ? (
                      <span
                        className={`arc-crumb arc-crumb--current ${accentClass}`}
                        aria-current="page"
                      >
                        {c.icon ? (
                          <span className="arc-crumb__icon">
                            <CrumbIcon Icon={c.icon} />
                          </span>
                        ) : null}
                        <span className="arc-crumb__label truncate max-w-[14rem]">
                          {c.label}
                        </span>
                        {isLast ? (
                          <span className="arc-crumb__pulse" aria-hidden />
                        ) : null}
                      </span>
                    ) : (
                      <Link
                        href={c.href}
                        className={`arc-crumb ${accentClass}`}
                        prefetch
                      >
                        {c.icon ? (
                          <span className="arc-crumb__icon">
                            <CrumbIcon Icon={c.icon} />
                          </span>
                        ) : null}
                        <span className="arc-crumb__label truncate max-w-[14rem]">
                          {c.label}
                        </span>
                        <ArrowUpRight className="arc-crumb__arrow w-3 h-3" aria-hidden />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* ============ Trailing (left side, RTL) ============ */}
          <div className="arc-breadcrumb-header__trailing">
            {badge ? (
              <span className="arc-breadcrumb-badge" aria-label={badge.label}>
                {badge.icon ? (
                  <span className="arc-breadcrumb-badge__icon">{badge.icon}</span>
                ) : (
                  <Sparkles className="arc-breadcrumb-badge__icon w-3 h-3" aria-hidden />
                )}
                <span className="arc-breadcrumb-badge__num tabular-nums">{badge.label}</span>
              </span>
            ) : null}
            {trailing}
          </div>
        </div>
      </div>

      <span className="arc-breadcrumb-header__scroll" aria-hidden />
    </header>
  );
}
