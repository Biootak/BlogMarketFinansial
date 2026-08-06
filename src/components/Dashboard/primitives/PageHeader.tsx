import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BarChart2,
  Bell,
  Building2,
  ChevronRight,
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
import {
  PAGE_HEADERS,
  type PageHeaderAccent,
  type PageHeaderCrumb,
  type PageHeaderIcon,
  type PageHeaderMetaItem,
  type PageHeaderRoute,
  type PageHeaderVariant,
} from './pageHeaders';

/**
 * PageHeader — Atlas 2026
 * ----------------------------------------------------------------------------
 * قانون: هر مسیر دقیقاً یک سربرگ. مالک هر مسیر در `pageHeaders.ts` مشخص شده
 * (layout / page / client). اگر صفحه‌ای زیر یک layoutِ سربرگ‌دار است، خودش
 * سربرگ نمی‌زند؛ اگر اکشن‌های سربرگ تعاملی‌اند، پوستهٔ کلاینت مالک است و
 * `page.tsx` سربرگ نمی‌زند.
 *
 * مصرف پیشنهادی:
 *   <PageHeader route="/dashboard/virtual-cards" actions={…} />
 *
 * برای عنوان‌های پویا (نام مشتری، شناسهٔ تراکنش) همان props صریح را بدهید؛
 * هر prop صریح بر پیش‌تنظیم اولویت دارد.
 *
 * ۲۰۲۶-۰۸ (Atlas):
 *  - `dir="rtl"` سخت‌کدشده حذف شد. سربرگ حالا جهت را از سند به ارث می‌برد،
 *    پس در بخش‌های LTR (اسناد فنی، پنل توسعه‌دهنده) وارونه نمی‌شود.
 *  - جداکنندهٔ خرده‌مسیر اصلاح شد: پایه ChevronRight + `rtl:rotate-180`.
 *    نسخهٔ قبلی ChevronLeft با rotate بود که در هر دو جهت خلاف جریان خواندن
 *    اشاره می‌کرد.
 *  - ستارهٔ SVG چرخان و گرادیان شعاعی قبلاً حذف شده‌اند (~۳۰ نود در هر مسیر).
 */

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

export type {
  PageHeaderAccent,
  PageHeaderCrumb,
  PageHeaderIcon,
  PageHeaderMetaItem,
  PageHeaderRoute,
  PageHeaderVariant,
};

interface PageHeaderBaseProps {
  breadcrumb?: PageHeaderCrumb[];
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  icon?: PageHeaderIcon;
  accent?: PageHeaderAccent;
  variant?: PageHeaderVariant;
  transition?: 'default' | 'none';
  className?: string;
  /** فقط در compact/minimal/strip: متریک‌های درون‌خطی کنار عنوان */
  meta?: PageHeaderMetaItem[];
}

/**
 * یا `route` بده و عنوان از جدول بیاید، یا `title` را صریح بده.
 * ترکیب هر دو هم مجاز است (عنوان پویا روی پیش‌تنظیم مسیر).
 */
export type PageHeaderProps =
  | (PageHeaderBaseProps & { route: PageHeaderRoute; title?: string })
  | (PageHeaderBaseProps & { route?: never; title: string });

const ACCENT_CLASS: Record<PageHeaderAccent, string> = {
  indigo: s['accent--indigo'],
  emerald: s['accent--emerald'],
  amber: s['accent--amber'],
  rose: s['accent--rose'],
  violet: s['accent--violet'],
  cyan: s['accent--cyan'],
};

/** خرده‌مسیر — یک تعریف، چهار مصرف. تکرار قبلی چهار نسخهٔ واگرا ساخته بود. */
function Breadcrumbs({ items }: { items: PageHeaderCrumb[] }) {
  if (items.length === 0) return null;

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
              <ChevronRight
                size={10}
                className={cn(s.breadcrumbSep, 'rtl:rotate-180')}
                aria-hidden
              />
            )}
          </span>
        );
      })}
    </nav>
  );
}

function InlineMeta({ items }: { items: PageHeaderMetaItem[] }) {
  if (items.length === 0) return null;

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

export function PageHeader(props: PageHeaderProps) {
  const preset = props.route ? PAGE_HEADERS[props.route] : undefined;

  const title = props.title ?? preset?.title ?? '';
  const description = props.description ?? preset?.description;
  const eyebrow = props.eyebrow ?? preset?.eyebrow;
  const iconName = props.icon ?? preset?.icon;
  const accent = props.accent ?? preset?.accent ?? 'indigo';
  const variant = props.variant ?? preset?.variant ?? 'default';
  const crumbs = props.breadcrumb ?? preset?.breadcrumb ?? [];
  const metrics = props.meta ?? [];
  const { actions, className, transition = 'none' } = props;

  const Icon = iconName ? ICON_MAP[iconName] : null;
  const style = transition === 'default' ? { viewTransitionName: 'dash-page' } : undefined;

  // `data-page-header` تنها راه ارزان تشخیص سربرگ تکراری در تست e2e است:
  // در هر مسیر باید دقیقاً یک المان با این ویژگی وجود داشته باشد.
  const shared = {
    'data-page-header': variant,
    style,
  } as const;

  // ── strip ────────────────────────────────────────────────────────────────
  if (variant === 'strip') {
    return (
      <header {...shared} className={cn(s.strip, ACCENT_CLASS[accent], className)}>
        <Breadcrumbs items={crumbs} />
        <div className={s.stripRow}>
          {Icon && (
            <div className={s.stripIcon} aria-hidden>
              <Icon size={15} strokeWidth={1.75} />
            </div>
          )}
          <h1 className={s.stripTitle}>{title}</h1>
          <InlineMeta items={metrics} />
          {actions && <div className={s.stripActions}>{actions}</div>}
        </div>
        {description && <p className={cn(s.description, s.stripDescription)}>{description}</p>}
      </header>
    );
  }

  // ── minimal ──────────────────────────────────────────────────────────────
  if (variant === 'minimal') {
    return (
      <header {...shared} className={cn(s.minimal, ACCENT_CLASS[accent], className)}>
        {eyebrow && <span className={s.minimalEyebrow}>{eyebrow}</span>}
        <div className={s.minimalRow}>
          {Icon && (
            <div className={s.minimalIcon} aria-hidden>
              <Icon size={17} strokeWidth={1.75} />
            </div>
          )}
          <h1 className={s.minimalTitle}>{title}</h1>
          <InlineMeta items={metrics} />
          {actions && <div className={s.minimalActions}>{actions}</div>}
        </div>
        {description && <p className={cn(s.description, s.minimalDescription)}>{description}</p>}
      </header>
    );
  }

  // ── compact ──────────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <header {...shared} className={cn(s.compact, ACCENT_CLASS[accent], className)}>
        <div className={s.compactTop}>
          <div className={s.metaRow}>
            <span className={s.dot} aria-hidden />
            <Breadcrumbs items={crumbs} />
            {eyebrow && <span className={s.eyebrow}>{eyebrow}</span>}
          </div>

          <div className={s.compactRow}>
            {Icon && (
              <div className={s.compactIcon} aria-hidden>
                <Icon size={17} strokeWidth={1.75} />
              </div>
            )}
            <h1 className={s.compactTitle}>{title}</h1>
            <InlineMeta items={metrics} />
          </div>

          {description && <p className={s.description}>{description}</p>}
        </div>

        {actions && <div className={s.actions}>{actions}</div>}
      </header>
    );
  }

  // ── default ──────────────────────────────────────────────────────────────
  return (
    <header {...shared} className={cn(s.header, ACCENT_CLASS[accent], className)}>
      <div className={s.body}>
        <div className={s.metaRow}>
          <span className={s.dot} aria-hidden />
          <Breadcrumbs items={crumbs} />
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
        <InlineMeta items={metrics} />
      </div>

      {actions && <div className={s.actions}>{actions}</div>}
    </header>
  );
}
