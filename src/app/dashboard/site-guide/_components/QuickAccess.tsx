'use client';

import { Zap } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import s from './QuickAccess.module.css';
import { type RouteItem, type Tone, quickAccessRoutes } from './data/site-guide-routes';

const TONE_ICON_CLASS: Record<Tone, string> = {
  primary: s.tonePrimary,
  emerald: s.toneEmerald,
  amber: s.toneAmber,
  rose: s.toneRose,
  violet: s.toneViolet,
  cyan: s.toneCyan,
  slate: s.toneSlate,
};

function QuickCard({ item }: { item: RouteItem }) {
  return (
    <Link
      href={item.path}
      className={s.card}
      target={item.path.startsWith('http') ? '_blank' : undefined}
    >
      <span className={`${s.icon} ${TONE_ICON_CLASS[item.tone]}`}>{item.icon as ReactNode}</span>
      <span className={s.label}>{item.label}</span>
      {item.badge && <span className={s.badge}>{item.badge}</span>}
    </Link>
  );
}

/**
 * QuickAccess — frequently used pages at a glance.
 * User-centric: "get to where I need to be fast".
 */
export function QuickAccess() {
  const items = quickAccessRoutes();
  if (items.length === 0) return null;

  return (
    <section className={s.section} aria-label="دسترسی سریع">
      <div className={s.header}>
        <span className={s.headerIcon}>
          <Zap size={16} />
        </span>
        <h2 className={s.title}>دسترسی سریع</h2>
        <p className={s.sub}>صفحات پرکاربرد — مستقیم به مقصد</p>
      </div>
      <div className={s.grid}>
        {items.map((item) => (
          <QuickCard key={item.path} item={item} />
        ))}
      </div>
    </section>
  );
}
