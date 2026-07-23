import { cn } from '@/lib/utils';
import {
  ArrowLeftRight,
  BarChart2,
  Bell,
  Building2,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  FileText,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  ShieldX,
  Tag,
  type LucideProps,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';
import s from './PageHeader.module.css';

export type PageHeaderIcon =
  | 'user-circle' | 'users' | 'shield-check' | 'shield-x'
  | 'clipboard-list' | 'layers' | 'arrow-left-right' | 'bell'
  | 'folder-open' | 'bar-chart' | 'layout-dashboard' | 'settings'
  | 'wallet' | 'file-text' | 'tag' | 'building' | 'credit-card';

const ICON_MAP: Record<PageHeaderIcon, FC<LucideProps>> = {
  'user-circle':      UserCircle,
  'users':            Users,
  'shield-check':     ShieldCheck,
  'shield-x':         ShieldX,
  'clipboard-list':   ClipboardList,
  'layers':           Layers,
  'arrow-left-right': ArrowLeftRight,
  'bell':             Bell,
  'folder-open':      FolderOpen,
  'bar-chart':        BarChart2,
  'layout-dashboard': LayoutDashboard,
  'settings':         Settings,
  'wallet':           Wallet,
  'file-text':        FileText,
  'tag':              Tag,
  'building':         Building2,
  'credit-card':      CreditCard,
};

export type PageHeaderAccent = 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan';

export interface PageHeaderProps {
  breadcrumb?: Array<{ href?: string; label: string }>;
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  icon?: PageHeaderIcon;
  accent?: PageHeaderAccent;
  transition?: 'default' | 'none';
  className?: string;
}

const ACCENT_CLASS: Record<PageHeaderAccent, string> = {
  indigo:  s['accent--indigo'],
  emerald: s['accent--emerald'],
  amber:   s['accent--amber'],
  rose:    s['accent--rose'],
  violet:  s['accent--violet'],
  cyan:    s['accent--cyan'],
};

export function PageHeader({
  breadcrumb,
  title,
  description,
  eyebrow,
  actions,
  icon,
  accent = 'indigo',
  transition = 'none',
  className,
}: PageHeaderProps) {
  const Icon = icon ? ICON_MAP[icon] : null;

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
              <stop offset="0%"   stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0"    />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="90" fill="url(#ph-mark-grad)" />
          <g className={s.markSpin}>
            <circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
            <circle cx="100" cy="100" r="68" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            {/* 8-point star — مثل AtelierHero */}
            <path
              d="M100 20 L113 87 L180 100 L113 113 L100 180 L87 113 L20 100 L87 87 Z"
              fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.55"
            />
            <path
              d="M100 40 L108 92 L160 100 L108 108 L100 160 L92 108 L40 100 L92 92 Z"
              fill="none" stroke="currentColor" strokeWidth="0.55" opacity="0.3"
            />
          </g>
        </svg>
      </div>

      {/* ── Body ── */}
      <div className={s.body}>

        {/* Meta row: live dot + breadcrumb + eyebrow */}
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
                      <ChevronLeft size={10} className={cn(s.breadcrumbSep, 'rtl:rotate-180')} aria-hidden />
                    )}
                  </span>
                );
              })}
            </nav>
          )}

          {eyebrow && <span className={s.eyebrow}>{eyebrow}</span>}
        </div>

        {/* Title row: icon box + title */}
        <div className={s.titleRow}>
          {Icon && (
            <div className={s.iconWrap} aria-hidden>
              <Icon size={22} strokeWidth={1.75} />
            </div>
          )}
          <h1 className={s.title}>{title}</h1>
        </div>

        {/* Description */}
        {description && <p className={s.description}>{description}</p>}
      </div>

      {/* ── Actions ── */}
      {actions && <div className={s.actions}>{actions}</div>}
    </header>
  );
}
