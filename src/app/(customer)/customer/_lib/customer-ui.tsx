'use client';

/**
 * Customer UI Components — اجزای مشترک بصری برای همهٔ صفحات پورتال مشتری
 * ----------------------------------------------------------------------------
 * تمام استایل‌ها inline (با var(--ds-*)) هستند تا نیازی به فایل CSS module
 * جداگانه نباشد. هر page فقط CSS module مخصوص خودش را دارد.
 *
 * الگوهای DNA مشترک:
 *   - <SectionHeader>   : dot pulse + title + sub + actions
 *   - <StatusPill>      : pill رنگی
 *   - <StatusDot>       : نقطه رنگی
 *   - <KeyValueRow>     : دو ستون
 *   - <EmptyHint>       : inline empty
 *   - <LiveDot>         : نقطه pulse
 *   - <StatusRail>      : rail عمودی رنگی
 *   - <KindIcon>        : icon نوع تراکنش
 */

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Coins,
  RefreshCw,
  Send,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import './customer-ui-animations.css';

// ─── Shared CSS tokens (با var) ─────────────────────────────────────────── //

const COLOR: Record<string, string> = {
  pending: 'var(--nova-amber)',
  progress: 'var(--nova-cyan)',
  success: 'var(--nova-up)',
  danger: 'var(--nova-down)',
  cancelled: 'var(--ds-text-muted)',
  warning: 'var(--nova-amber)',
  neutral: 'var(--ds-text-muted)',
  approved: 'var(--nova-up)',
  brand: 'var(--ds-brand-500)',
};

// ─── LiveDot ────────────────────────────────────────────────────────────── //

export function LiveDot({
  size = 5,
  tone = 'brand',
}: {
  size?: number;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}) {
  const color = COLOR[tone] ?? COLOR.brand;
  return (
    <span
      aria-hidden
      style={
        {
          display: 'inline-block',
          inlineSize: size,
          blockSize: size,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 0 0 color-mix(in oklch, ${color} 50%, transparent)`,
          animation: 'livePulse 2000ms ease-in-out infinite',
        } as CSSProperties
      }
    />
  );
}

// ─── SectionHeader ──────────────────────────────────────────────────────── //

export function SectionHeader({
  title,
  sub,
  icon: Icon,
  actions,
}: {
  title: string;
  sub?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--ds-space-3)',
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--ds-space-2)',
          minInlineSize: 0,
        }}
      >
        {Icon && (
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              inlineSize: '1.25rem',
              blockSize: '1.25rem',
              borderRadius: 'var(--ds-radius-sm)',
              background: 'color-mix(in oklch, var(--ds-brand-500) 8%, transparent)',
              color: 'var(--ds-brand-600)',
              flexShrink: 0,
            }}
          >
            <Icon size={12} />
          </span>
        )}
        <LiveDot size={5} />
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--ds-text-base)',
            fontWeight: 700,
            color: 'var(--ds-text-primary)',
            letterSpacing: '0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </h2>
        {sub && (
          <span
            style={{
              fontSize: '0.6875rem',
              color: 'var(--ds-text-muted)',
              fontWeight: 500,
            }}
          >
            {sub}
          </span>
        )}
      </div>
      {actions && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--ds-space-2)' }}>
          {actions}
        </div>
      )}
    </header>
  );
}

// ─── StatusPill ─────────────────────────────────────────────────────────── //

export type StatusVariant =
  | 'pending'
  | 'progress'
  | 'success'
  | 'danger'
  | 'cancelled'
  | 'warning'
  | 'neutral'
  | 'approved';

export function StatusPill({
  children,
  variant,
}: {
  children: ReactNode;
  variant: StatusVariant;
}) {
  const color = COLOR[variant] ?? COLOR.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '0.625rem',
        fontWeight: 700,
        paddingBlock: '0.15em',
        paddingInline: '0.5em',
        borderRadius: '999px',
        border: `1px solid color-mix(in oklch, ${color} 35%, transparent)`,
        background: `color-mix(in oklch, ${color} 10%, transparent)`,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

// ─── StatusDot ──────────────────────────────────────────────────────────── //

export function StatusDot({
  variant,
  pulse = false,
}: {
  variant: StatusVariant;
  pulse?: boolean;
}) {
  const color = COLOR[variant] ?? COLOR.neutral;
  return (
    <span
      aria-hidden
      style={
        {
          display: 'inline-block',
          inlineSize: 6,
          blockSize: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          animation: pulse ? 'livePulse 1800ms ease-in-out infinite' : undefined,
        } as CSSProperties
      }
    />
  );
}

// ─── KindIcon ───────────────────────────────────────────────────────────── //

const KIND_ICON_MAP: Record<string, LucideIcon> = {
  DEPOSIT: ArrowDownLeft,
  WITHDRAWAL: ArrowUpRight,
  TRANSFER: Send,
  EXCHANGE: ArrowLeftRight,
  FEE: Coins,
  SETTLEMENT: WalletCards,
  ADJUSTMENT: RefreshCw,
};

export function KindIcon({ kind, size = 13 }: { kind: string; size?: number }) {
  const Icon = KIND_ICON_MAP[kind] ?? CircleDollarSign;
  return <Icon size={size} aria-hidden />;
}

// ─── KeyValueRow ────────────────────────────────────────────────────────── //

export function KeyValueRow({
  label,
  value,
  mono,
  dir,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  dir?: 'ltr' | 'rtl' | 'auto';
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--ds-space-3)',
        paddingBlock: 'var(--ds-space-2)',
        paddingInline: 'var(--ds-space-3)',
        borderBlockEnd: '1px solid var(--ds-border-subtle)',
        fontSize: 'var(--ds-text-xs)',
      }}
    >
      <span style={{ color: 'var(--ds-text-muted)', fontWeight: 500 }}>{label}</span>
      <span
        dir={dir}
        style={{
          color: emphasis ? 'var(--ds-text-primary)' : 'var(--ds-text-primary)',
          fontWeight: emphasis ? 700 : 500,
          fontVariantNumeric: mono ? 'tabular-nums' : undefined,
          textAlign: 'end',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── EmptyHint ──────────────────────────────────────────────────────────── //

export function EmptyHint({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--ds-space-3)',
        paddingBlock: 'var(--ds-space-6)',
        paddingInline: 'var(--ds-space-4)',
        textAlign: 'center',
      }}
    >
      {Icon && (
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            inlineSize: '2.25rem',
            blockSize: '2.25rem',
            borderRadius: 'var(--ds-radius-md)',
            background: 'color-mix(in oklch, var(--ds-brand-500) 8%, transparent)',
            color: 'var(--ds-brand-600)',
          }}
        >
          <Icon size={20} />
        </span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25em' }}>
        <strong style={{ color: 'var(--ds-text-primary)', fontSize: 'var(--ds-text-sm)' }}>
          {title}
        </strong>
        {description && (
          <p
            style={{
              margin: 0,
              color: 'var(--ds-text-muted)',
              fontSize: 'var(--ds-text-xs)',
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── KYC Status Icon ────────────────────────────────────────────────────── //

export function KycStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 size={13} aria-hidden />;
    case 'PENDING':
      return <Clock size={13} aria-hidden />;
    case 'REJECTED':
    case 'EXPIRED':
      return <AlertTriangle size={13} aria-hidden />;
    default:
      return <ShieldCheck size={13} aria-hidden />;
  }
}

// ─── StatusRail wrapper ─────────────────────────────────────────────────── //

export function StatusRail({ variant }: { variant: StatusVariant }) {
  const color = COLOR[variant] ?? COLOR.brand;
  return (
    <span
      aria-hidden
      style={
        {
          position: 'absolute',
          insetBlock: 0,
          insetInlineStart: 0,
          inlineSize: 2,
          background: color,
          transition: 'inline-size 200ms var(--ds-ease-out-quart)',
        } as CSSProperties
      }
    />
  );
}

// ─── View All Link ──────────────────────────────────────────────────────── //

export function ViewAllLink({
  href,
  children,
  icon: Icon,
}: { href: string; children: ReactNode; icon?: LucideIcon }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--ds-space-1)',
        fontSize: '0.6875rem',
        color: 'var(--ds-text-muted)',
        textDecoration: 'none',
        paddingBlock: 'var(--ds-space-1)',
        paddingInline: 'var(--ds-space-2)',
        borderRadius: 'var(--ds-radius-sm)',
        border: '1px solid var(--ds-border-subtle)',
        transition:
          'color 160ms var(--ds-ease-out-quart), border-color 160ms var(--ds-ease-out-quart)',
      }}
    >
      {Icon && <Icon size={11} aria-hidden />}
      {children}
    </a>
  );
}

// ─── Subtle Animations (global @keyframes) ─────────────────────────────── //
//
// این تکه باید در CSS global تزریق شود، ولی چون AGENTS.md اجازه نمی‌دهد
// global CSS اضافه کنیم، از یک <style> تزریقی در root استفاده می‌کنیم.
// اما بهتر است فقط در این layout استفاده شود که قبلاً load می‌شود.
//
// برای سادگی، از <style> در هر page استفاده نمی‌کنیم — animation از طریق
// CSS variable + inline style کافی است.
//
// ⚠️ نکته: animation ها نیاز به keyframes دارند. اگر keyframe در CSS module
// هر page تعریف شود، هر page می‌تواند از آن استفاده کند. اما این فایل
// pure TSX است و keyframe ندارد. بنابراین animation برای dots و pulse
// نیاز به keyframes دارد — این در page CSS modules تعریف می‌شود.
