import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BarChart2,
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
  | 'device-phone-mobile';

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
};

export type PageHeaderAccent = 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan';

/**
 * variant:
 *  - 'default'  — سربرگ کامل با قاعده‌ی افقی (صفحات اصلی)
 *  - 'compact'  — کوتاه‌تر، مناسب صفحات فهرست با سنجه در ادامه
 *  - 'minimal'  — فقط eyebrow + عنوان، بدون قاعده
 *  - 'strip'    — نوار باریک خرده‌مسیر، مناسب تنظیمات
 *
 * ۲۰۲۶-۰۸ (Atlas): ستاره‌ی هشت‌پرِ چرخان و گرادیان شعاعی حذف شد. حدود ۳۰ نود
 * SVG در هر مسیر داشبورد رندر می‌شد و هیچ اطلاعاتی منتقل نمی‌کرد. API عمومی
 * دست‌نخورده است.
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
  /** فقط در compact/minimal/strip: متریک‌های درون‌خطی کنار عنوان */
  meta?: Array<{ label: string; value: string | number }>;
}

const ACCENT_CLASS: Record<PageHeaderAccent, string> = {
  indigo: s['accent--indigo'],
  emerald: s['accent--emerald'],
  amber: s['accent--amber'],
  rose: s['accent--rose'],
  violet: s['accent--violet'],
  cyan: s['accent--cyan'],
};

/** خرده‌مسیر — یک تعریف، چهار مصرف. تکرار قبلی چهار نسخه‌ی واگرا ساخته بود. */
function Breadcrumbs({ items }: { items: NonNullable<PageHeaderProps['breadcrumb']> }) {
  return (
    <nav aria-label="مسیر" className={s.breadcrumb}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
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
  );
}

function InlineMeta({ items }: { items: NonNullable<PageHeaderProps['meta']> }) {
  return (
    <div className={s.inlineMeta}>
      {items.map((m) => (
        <span key={m.label} className={s.inlineMetaItem}>
          <span className={s.inlineMetaValue}>{m.value}</span>
          <span className={s.inlineMetaLabel}>{m.label}</span>
        </span>
      ))}
    </div>
  );
}

export function PageHeader({
  breadcrumb,
  title,
  description,
  eyebrow,
  actions,
  icon,
  accent = 'indigo',
  variant = 'default',
  transition = 'none',
  className,
  meta,
}: PageHeaderProps) {
  const Icon = icon ? ICON_MAP[icon] : null;
  const style = transition === 'default' ? { viewTransitionName: 'dash-page' } : undefined;
  const hasBreadcrumb = Boolean(breadcrumb && breadcrumb.length > 0);
  const hasMeta = Boolean(meta && meta.length > 0);

  // ── strip ────────────────────────────────────────────────────────────────
  if (variant === 'strip') {
    return (
      <header className={cn(s.strip, ACCENT_CLASS[accent], className)} style={style} dir="rtl">
        {hasBreadcrumb && <Breadcrumbs items={breadcrumb!} />}
        <div className={s.stripRow}>
          {Icon && (
            <div className={s.stripIcon} aria-hidden>
              <Icon size={15} strokeWidth={1.75} />
            </div>
          )}
          <h1 className={s.stripTitle}>{title}</h1>
          {hasMeta && <InlineMeta items={meta!} />}
          {actions && <div className={s.stripActions}>{actions}</div>}
        </div>
        {description && <p className={cn(s.description, s.stripDescription)}>{description}</p>}
      </header>
    );
  }

  // ── minimal ──────────────────────────────────────────────────────────────
  if (variant === 'minimal') {
    return (
      <header className={cn(s.minimal, ACCENT_CLASS[accent], className)} style={style} dir="rtl">
        {eyebrow && <span className={s.minimalEyebrow}>{eyebrow}</span>}
        <div className={s.minimalRow}>
          {Icon && (
            <div className={s.minimalIcon} aria-hidden>
              <Icon size={17} strokeWidth={1.75} />
            </div>
          )}
          <h1 className={s.minimalTitle}>{title}</h1>
          {hasMeta && <InlineMeta items={meta!} />}
          {actions && <div className={s.minimalActions}>{actions}</div>}
        </div>
        {description && <p className={cn(s.description, s.minimalDescription)}>{description}</p>}
      </header>
    );
  }

  // ── compact ──────────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <header className={cn(s.compact, ACCENT_CLASS[accent], className)} style={style} dir="rtl">
        <div className={s.compactTop}>
          <div className={s.metaRow}>
            <span className={s.dot} aria-hidden />
            {hasBreadcrumb && <Breadcrumbs items={breadcrumb!} />}
            {eyebrow && <span className={s.eyebrow}>{eyebrow}</span>}
          </div>

          <div className={s.compactRow}>
            {Icon && (
              <div className={s.compactIcon} aria-hidden>
                <Icon size={17} strokeWidth={1.75} />
              </div>
            )}
            <h1 className={s.compactTitle}>{title}</h1>
            {hasMeta && <InlineMeta items={meta!} />}
          </div>

          {description && <p className={s.description}>{description}</p>}
        </div>

        {actions && <div className={s.actions}>{actions}</div>}
      </header>
    );
  }

  // ── default ──────────────────────────────────────────────────────────────
  return (
    <header className={cn(s.header, ACCENT_CLASS[accent], className)} style={style} dir="rtl">
      <div className={s.body}>
        <div className={s.metaRow}>
          <span className={s.dot} aria-hidden />
          {hasBreadcrumb && <Breadcrumbs items={breadcrumb!} />}
          {eyebrow && <span className={s.eyebrow}>{eyebrow}</span>}
        </div>

        <div className={s.titleRow}>
          {Icon && (
            <div className={s.iconWrap} aria-hidden>
              <Icon size={21} strokeWidth={1.75} />
            </div>
          )}
          <h1 className={s.title}>{title}</h1>
        </div>

        {description && <p className={s.description}>{description}</p>}
        {hasMeta && <InlineMeta items={meta!} />}
      </div>

      {actions && <div className={s.actions}>{actions}</div>}
    </header>
  );
}
