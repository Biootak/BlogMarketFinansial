import { BookmarkButton } from '@/components/Dashboard/primitives';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BarChart2,
  BarChart3,
  Bell,
  Building2,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Database,
  FileText,
  FolderOpen,
  Gauge,
  Headset,
  Inbox,
  KeyRound,
  Layers,
  LayoutDashboard,
  type LucideProps,
  Megaphone,
  MessageSquare,
  Radar,
  Send,
  Settings,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Sparkles,
  Tag,
  Ticket,
  UserCircle,
  Users,
  Wallet,
  Workflow,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';
import s from './PageHeader.module.css';

export type PageHeaderIcon =
  | 'user-circle'
  | 'users'
  | 'shield-check'
  | 'shield-x'
  | 'clipboard-list'
  | 'layers'
  | 'arrow-left-right'
  | 'bell'
  | 'folder-open'
  | 'bar-chart'
  | 'bar-chart-3'
  | 'layout-dashboard'
  | 'settings'
  | 'wallet'
  | 'file-text'
  | 'tag'
  | 'building'
  | 'credit-card'
  | 'sparkles'
  | 'activity'
  | 'radar'
  | 'gauge'
  | 'zap'
  | 'alert-triangle'
  | 'database'
  | 'workflow'
  | 'inbox'
  | 'send'
  | 'megaphone'
  | 'message-square'
  | 'ticket'
  | 'key-round'
  | 'circle-dollar-sign'
  | 'device-phone-mobile'
  | 'headset';

const ICON_MAP: Record<PageHeaderIcon, FC<LucideProps>> = {
  'user-circle': UserCircle,
  users: Users,
  'shield-check': ShieldCheck,
  'shield-x': ShieldX,
  'clipboard-list': ClipboardList,
  layers: Layers,
  'arrow-left-right': ArrowLeftRight,
  bell: Bell,
  'folder-open': FolderOpen,
  'bar-chart': BarChart2,
  'bar-chart-3': BarChart3,
  'layout-dashboard': LayoutDashboard,
  settings: Settings,
  wallet: Wallet,
  'file-text': FileText,
  tag: Tag,
  building: Building2,
  'credit-card': CreditCard,
  sparkles: Sparkles,
  activity: Activity,
  radar: Radar,
  gauge: Gauge,
  zap: Zap,
  'alert-triangle': AlertTriangle,
  database: Database,
  workflow: Workflow,
  inbox: Inbox,
  send: Send,
  megaphone: Megaphone,
  'message-square': MessageSquare,
  ticket: Ticket,
  'key-round': KeyRound,
  'circle-dollar-sign': CircleDollarSign,
  'device-phone-mobile': Smartphone,
  headset: Headset,
};

export type PageHeaderAccent = 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan';

/**
 * variant:
 *  - 'default'  — کارت پانورامیک کامل با SVG mark (صفحات اصلی)
 *  - 'compact'  — کوتاه‌تر بدون SVG mark، مناسب صفحات list با KPI پایینش
 *  - 'minimal'  — فقط eyebrow + title inline بدون card، مناسب analytics/dashboard
 *  - 'strip'    — breadcrumb + title کوچک‌تر بدون background card، مناسب settings
 */
export type PageHeaderVariant = 'default' | 'compact' | 'minimal' | 'strip';

export interface PageHeaderProps {
  breadcrumb?: Array<{ href?: string; label: string }>;
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  icon?: PageHeaderIcon;
  accent?: PageHeaderAccent;
  variant?: PageHeaderVariant;
  transition?: 'default' | 'none';
  className?: string;
  /** فقط در compact/minimal: متریک‌های inline کنار title */
  meta?: Array<{ label: string; value: string | number }>;
  /** Optional: enable bookmark button for this page */
  bookmarkId?: string;
}

const ACCENT_CLASS: Record<PageHeaderAccent, string> = {
  indigo: s['accent--indigo'],
  emerald: s['accent--emerald'],
  amber: s['accent--amber'],
  rose: s['accent--rose'],
  violet: s['accent--violet'],
  cyan: s['accent--cyan'],
};

export function PageHeader({
  breadcrumb,
  title,
  description,
  eyebrow,
  actions,
  icon,
  accent = 'emerald',
  variant = 'default',
  transition = 'none',
  className,
  meta,
  bookmarkId,
}: PageHeaderProps) {
  const Icon = icon ? ICON_MAP[icon] : null;

  // ── strip variant: breadcrumb bar بدون card ──────────────────────────────
  if (variant === 'strip') {
    return (
      <header
        className={cn(s.strip, ACCENT_CLASS[accent], className)}
        style={transition === 'default' ? { viewTransitionName: 'dash-page' } : undefined}
        dir="rtl"
      >
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="مسیر" className={s.breadcrumb}>
            {breadcrumb.map((item, i) => {
              const isLast = i === breadcrumb.length - 1;
              return (
                <span key={`${item.label}-${i}`} className="flex items-center gap-1">
                  {item.href && !isLast ? (
                    <Link href={item.href} className={s.breadcrumbLink}>
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? 'page' : undefined}
                      className={isLast ? s.breadcrumbCurrent : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                  {!isLast && (
                    <ChevronLeft
                      size={10}
                      className={cn(s.breadcrumbSep, 'rtl:rotate-180')}
                      aria-hidden
                    />
                  )}
                </span>
              );
            })}
          </nav>
        )}
        <div className={s.stripRow}>
          {Icon && (
            <div className={s.stripIcon} aria-hidden>
              <Icon size={16} strokeWidth={1.75} />
            </div>
          )}
          <h1 className={s.stripTitle}>{title}</h1>
          {meta && meta.length > 0 && (
            <div className={s.inlineMeta}>
              {meta.map((m) => (
                <span key={m.label} className={s.inlineMetaItem}>
                  <span className={s.inlineMetaValue}>{m.value}</span>
                  <span className={s.inlineMetaLabel}>{m.label}</span>
                </span>
              ))}
            </div>
          )}
          {actions && <div className={s.stripActions}>{actions}</div>}
          {bookmarkId && (
            <div className={s.stripActions}>
              <BookmarkButton id={bookmarkId} label="نشان‌کردن صفحه" />
            </div>
          )}
        </div>
        {description && <p className={cn(s.description, s.stripDescription)}>{description}</p>}
      </header>
    );
  }

  // ── minimal variant: inline بدون card ────────────────────────────────────
  if (variant === 'minimal') {
    return (
      <header
        className={cn(s.minimal, ACCENT_CLASS[accent], className)}
        style={transition === 'default' ? { viewTransitionName: 'dash-page' } : undefined}
        dir="rtl"
      >
        {eyebrow && <span className={s.minimalEyebrow}>{eyebrow}</span>}
        <div className={s.minimalRow}>
          {Icon && (
            <div className={s.minimalIcon} aria-hidden>
              <Icon size={18} strokeWidth={1.75} />
            </div>
          )}
          <h1 className={s.minimalTitle}>{title}</h1>
          {meta && meta.length > 0 && (
            <div className={s.inlineMeta}>
              {meta.map((m) => (
                <span key={m.label} className={s.inlineMetaItem}>
                  <span className={s.inlineMetaValue}>{m.value}</span>
                  <span className={s.inlineMetaLabel}>{m.label}</span>
                </span>
              ))}
            </div>
          )}
          {actions && <div className={s.minimalActions}>{actions}</div>}
        </div>
        {description && <p className={cn(s.description, s.minimalDescription)}>{description}</p>}
      </header>
    );
  }

  // ── compact variant: کارت کوتاه‌تر بدون SVG mark ─────────────────────────
  if (variant === 'compact') {
    return (
      <header
        className={cn(s.compact, ACCENT_CLASS[accent], className)}
        style={transition === 'default' ? { viewTransitionName: 'dash-page' } : undefined}
        dir="rtl"
      >
        <div className={s.compactTop}>
          <div className={s.metaRow}>
            <span className={s.dot} aria-hidden />
            {breadcrumb && breadcrumb.length > 0 && (
              <nav aria-label="مسیر" className={s.breadcrumb}>
                {breadcrumb.map((item, i) => {
                  const isLast = i === breadcrumb.length - 1;
                  return (
                    <span key={`${item.label}-${i}`} className="flex items-center gap-1">
                      {item.href && !isLast ? (
                        <Link href={item.href} className={s.breadcrumbLink}>
                          {item.label}
                        </Link>
                      ) : (
                        <span
                          aria-current={isLast ? 'page' : undefined}
                          className={isLast ? s.breadcrumbCurrent : undefined}
                        >
                          {item.label}
                        </span>
                      )}
                      {!isLast && (
                        <ChevronLeft
                          size={10}
                          className={cn(s.breadcrumbSep, 'rtl:rotate-180')}
                          aria-hidden
                        />
                      )}
                    </span>
                  );
                })}
              </nav>
            )}
            {eyebrow && <span className={s.eyebrow}>{eyebrow}</span>}
          </div>

          <div className={s.compactRow}>
            {Icon && (
              <div className={s.compactIcon} aria-hidden>
                <Icon size={18} strokeWidth={1.75} />
              </div>
            )}
            <h1 className={s.compactTitle}>{title}</h1>
            {meta && meta.length > 0 && (
              <div className={s.inlineMeta}>
                {meta.map((m) => (
                  <span key={m.label} className={s.inlineMetaItem}>
                    <span className={s.inlineMetaValue}>{m.value}</span>
                    <span className={s.inlineMetaLabel}>{m.label}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {description && <p className={s.description}>{description}</p>}
        </div>

        {actions && <div className={s.actions}>{actions}</div>}
      </header>
    );
  }

  // ── default variant: کارت پانورامیک کامل با SVG mark ────────────────────
  return (
    <header
      className={cn(s.header, ACCENT_CLASS[accent], className)}
      style={transition === 'default' ? { viewTransitionName: 'dash-page' } : undefined}
      dir="rtl"
    >
      {/* ── SVG geometric mark — eight-point star, آروم می‌چرخه ── */}
      <div className={s.mark} aria-hidden>
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <defs>
            <radialGradient id="ph-mark-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="90" fill="url(#ph-mark-grad)" />
          <g className={s.markSpin}>
            <circle
              cx="100"
              cy="100"
              r="84"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              opacity="0.4"
            />
            <circle
              cx="100"
              cy="100"
              r="68"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.25"
            />
            <path
              d="M100 20 L113 87 L180 100 L113 113 L100 180 L87 113 L20 100 L87 87 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.9"
              opacity="0.55"
            />
            <path
              d="M100 40 L108 92 L160 100 L108 108 L100 160 L92 108 L40 100 L92 92 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.55"
              opacity="0.3"
            />
          </g>
        </svg>
      </div>

      {/* ── Body ── */}
      <div className={s.body}>
        <div className={s.metaRow}>
          <span className={s.dot} aria-hidden />
          {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label="مسیر" className={s.breadcrumb}>
              {breadcrumb.map((item, i) => {
                const isLast = i === breadcrumb.length - 1;
                return (
                  <span key={`${item.label}-${i}`} className="flex items-center gap-1">
                    {item.href && !isLast ? (
                      <Link href={item.href} className={s.breadcrumbLink}>
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        aria-current={isLast ? 'page' : undefined}
                        className={isLast ? s.breadcrumbCurrent : undefined}
                      >
                        {item.label}
                      </span>
                    )}
                    {!isLast && (
                      <ChevronLeft
                        size={10}
                        className={cn(s.breadcrumbSep, 'rtl:rotate-180')}
                        aria-hidden
                      />
                    )}
                  </span>
                );
              })}
            </nav>
          )}
          {eyebrow && <span className={s.eyebrow}>{eyebrow}</span>}
        </div>

        <div className={s.titleRow}>
          {Icon && (
            <div className={s.iconWrap} aria-hidden>
              <Icon size={22} strokeWidth={1.75} />
            </div>
          )}
          <h1 className={s.title}>{title}</h1>
        </div>

        {description && <p className={s.description}>{description}</p>}
      </div>

      {actions && <div className={s.actions}>{actions}</div>}
    </header>
  );
}
