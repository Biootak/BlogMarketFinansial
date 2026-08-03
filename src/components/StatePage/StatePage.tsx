/**
 * StatePage — Million-dollar shared error/special-state surface (2026).
 *
 * Used by:
 *   - /forbidden (403)
 *   - /session-expired
 *   - /offline
 *   - /maintenance
 *
 * Renders an asymmetric editorial composition:
 *   - LEFT  (5fr): status rail — eyebrow chip, huge Persian number, title,
 *                  lead paragraph, meta grid
 *   - RIGHT (7fr): focal glass card — animated icon mark, body, help list,
 *                  asymmetric CTA pair, support foot
 *
 * Design: tokens only (oklch), RTL logical props, mobile-first single
 * column, no inline styles, no hex.
 */

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import s from './state-page.module.css';

export interface StatePageAction {
  /** Visible label (Persian). */
  label: string;
  /** Target href. */
  href: string;
  /** Optional lucide icon — 16px strokeWidth 2. */
  icon?: LucideIcon;
  /** Action type. `primary` is filled; `ghost` is outline. Default: `primary`. */
  variant?: 'primary' | 'ghost';
  /** When true, opens in a new tab. */
  external?: boolean;
}

export interface StatePageMetaItem {
  label: string;
  value: ReactNode;
}

export interface StatePageProps {
  /** 3-4 char status code shown huge (e.g. "403", "۴۰۴", "OFF", "MNT"). */
  number: string;
  /** Eyebrow chip text above the number. */
  eyebrow: string;
  /** Bold title (Persian). */
  title: string;
  /** Lead paragraph (Persian). */
  lead: string;
  /** Card title (e.g. "چه کار کنم؟"). */
  cardTitle: string;
  /** Card body — short explanation. */
  cardBody: string;
  /** Lucide icon for the focal mark. */
  icon: LucideIcon;
  /** Optional bullet list of action steps / explanations. */
  helpList?: string[];
  /** Optional action buttons. */
  actions?: StatePageAction[];
  /** Optional meta grid (3-4 items). */
  meta?: StatePageMetaItem[];
  /** Optional footer text + link. */
  foot?: { label: string; href: string };
  /** Tone — affects hue. Default: `info` (blue). */
  tone?: 'info' | 'warn' | 'success' | 'danger';
  /** Override CSS hue for the ambient field. */
  hue?: number;
}

function renderAction(action: StatePageAction, index: number, isPrimary: boolean) {
  const Icon = action.icon;
  const className = isPrimary ? s.btnPrimary : s.btnGhost;
  const content = (
    <>
      {action.label}
      {Icon ? <Icon size={16} strokeWidth={2} aria-hidden /> : null}
    </>
  );

  if (action.external) {
    return (
      <a
        key={`${action.href}-${index}`}
        href={action.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }
  return (
    <Link key={`${action.href}-${index}`} href={action.href} className={className}>
      {content}
    </Link>
  );
}

export default function StatePage({
  number,
  eyebrow,
  title,
  lead,
  cardTitle,
  cardBody,
  icon: Icon,
  helpList,
  actions = [],
  meta,
  foot,
  tone = 'info',
  hue,
}: StatePageProps) {
  const resolvedHue = typeof hue === 'number' ? hue : TONE_HUE[tone];
  const rootStyle: React.CSSProperties = { ['--state-hue' as string]: String(resolvedHue) };

  return (
    <div className={s.root} dir="rtl" data-tone={tone} style={rootStyle}>
      <div className={s.field} aria-hidden />
      <div className={s.geo} aria-hidden />

      <div className={s.shell}>
        {/* ── Left rail ───────────────────────── */}
        <aside className={s.rail} aria-label={eyebrow}>
          <span className={s.eyebrow}>
            <Icon size={14} strokeWidth={1.8} aria-hidden />
            {eyebrow}
          </span>

          <h1 className={s.railNumber} dir="ltr" aria-hidden>
            {number}
          </h1>
          <h2 className={s.railTitle} role="status">
            {title}
          </h2>
          <p className={s.railLead}>{lead}</p>

          {meta && meta.length > 0 ? (
            <div className={s.railMeta}>
              {meta.map((item) => (
                <div key={item.label} className={s.metaItem}>
                  <span className={s.metaLabel}>{item.label}</span>
                  <span className={s.metaValue}>{item.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </aside>

        {/* ── Right card ──────────────────────── */}
        <section className={s.card} aria-labelledby="state-card-title">
          <div className={s.mark} aria-hidden>
            <span className={s.markRing} />
            <span className={s.markRing} />
            <span className={s.markRing} />
            <span className={s.markCore}>
              <Icon size={26} strokeWidth={1.75} />
            </span>
          </div>

          <h3 id="state-card-title" className={s.cardTitle}>
            {cardTitle}
          </h3>
          <p className={s.cardBody}>{cardBody}</p>

          {helpList && helpList.length > 0 ? (
            <ul className={s.helpList}>
              {helpList.map((step) => (
                <li key={step} className={s.helpItem}>
                  {step}
                </li>
              ))}
            </ul>
          ) : null}

          {actions.length > 0 ? (
            <div className={s.actions}>
              {actions.map((action, i) => renderAction(action, i, action.variant !== 'ghost'))}
            </div>
          ) : null}

          {foot ? (
            <div className={s.foot}>
              <Icon size={14} strokeWidth={1.8} aria-hidden className={s.footIcon} />
              <span>{foot.label}</span>
              <a href={foot.href} dir="ltr">
                {foot.href.replace(/^mailto:|^tel:/, '')}
              </a>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

const TONE_HUE: Record<NonNullable<StatePageProps['tone']>, number> = {
  info: 235,
  warn: 75,
  success: 165,
  danger: 22,
};

// Re-export for callers that want to render their own
export type { StatePageAction as Action, StatePageMetaItem as MetaItem, StatePageProps as Props };
