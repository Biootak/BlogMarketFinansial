'use client';

/**
 * AudiencesView v2 — Audience Gallery
 * ساختار: HEADER (cover) → STAT (3 blocks) → DISTRIBUTION strip → CONTROLS → GALLERY grid
 * هر audience = کارت افقی بزرگ با visualizer
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Layers,
  Search,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CountUp, EmptyState, LiveDot } from '@/components/Dashboard/primitives';
import s from './Audiences.module.css';

type AudienceTone = 'emerald' | 'indigo' | 'amber' | 'violet' | 'cyan' | 'rose';

export interface AudienceRow {
  id: string;
  label: string;
  description: string;
  count: number;
  tone: AudienceTone;
  targetedCount: number;
}

export interface AudiencesViewData {
  audiences: AudienceRow[];
  totalUsers: number;
  totalTargeted: number;
  distribution: Array<{ id: string; label: string; count: number; tone: AudienceTone }>;
  activeCampaigns: number;
}

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));
const fmtPercent = (num: number, denom: number) => {
  if (denom <= 0) return 0;
  return Math.round((num / denom) * 1000) / 10;
};

function toneHue(tone: AudienceTone): number {
  return { emerald: 165, indigo: 245, amber: 70, violet: 290, cyan: 210, rose: 25 }[tone];
}

function getAudienceIcon(id: string): LucideIcon {
  if (id === 'all') return Users;
  if (id.startsWith('role:')) return Target;
  return Sparkles;
}

const TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'همه', icon: Layers },
  { id: 'all-aud', label: 'همه کاربران', icon: Users },
  { id: 'role', label: 'بر اساس نقش', icon: Target },
  { id: 'segment', label: 'سگمنت', icon: Sparkles },
];

export function AudiencesView({ initialData }: { initialData: AudiencesViewData }) {
  const [tab, setTab] = useState<string>('all');
  const [query, setQuery] = useState<string>('');

  // ── filtering ──
  const filtered = useMemo(() => {
    let rows = initialData.audiences;
    if (tab === 'all-aud') rows = rows.filter((r) => r.id === 'all');
    else if (tab === 'role') rows = rows.filter((r) => r.id.startsWith('role:'));
    else if (tab === 'segment') rows = rows.filter((r) => r.id === 'segment');
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (r) => r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [tab, query, initialData]);

  // ── sort by count desc ──
  const ordered = useMemo(() => {
    return [...filtered].sort((a, b) => b.count - a.count);
  }, [filtered]);

  const totalUsers = initialData.totalUsers;
  const totalTargeted = initialData.totalTargeted;
  const coveragePct = totalUsers > 0 ? Math.round((totalTargeted / totalUsers) * 100) : 0;

  return (
    <div className={s.page} dir="rtl">
      {/* ═══ HEADER ═══════════════════════════════════════ */}
      <header className={s.header}>
        <nav className={s.crumbs} aria-label="مسیر">
          <Link href="/dashboard" className={s.crumbLink}>داشبورد</Link>
          <span className={s.crumbSep}>/</span>
          <Link href="/dashboard/communication" className={s.crumbLink}>مرکز ارتباطات</Link>
          <span className={s.crumbSep}>/</span>
          <span className={s.crumbCurrent} aria-current="page">مخاطبان هدف</span>
        </nav>

        <div className={s.headerMain}>
          <div className={s.headerMainLeft}>
            <span className={s.eyebrow}>
              <LiveDot tone="emerald" size="sm" />
              گالری مخاطبان
            </span>
            <h1 className={s.title}>مخاطبان هدف</h1>
            <p className={s.lead}>
              پیام را به گروه دقیق برسانید — نه به همه. هر audience یک جامعه با رفتار و حساسیت متفاوت.
            </p>
          </div>
          <div className={s.headerMainRight}>
            <Button variant="outline" asChild>
              <Link href="/dashboard/communication">
                <ChevronLeft size={14} aria-hidden />
                مرکز
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ═══ STAT STRIP ════════════════════════════════════ */}
      <div className={s.statStrip}>
        <div className={s.statBlock} data-tone="emerald">
          <span className={s.statLabel}>کل کاربران</span>
          <span className={s.statValue}>
            <CountUp value={totalUsers} duration={700} locale="fa-IR" />
          </span>
          <span className={s.statMeta}>پایه هدف‌گذاری</span>
        </div>
        <div className={s.statBlock} data-tone="indigo">
          <span className={s.statLabel}>هدف‌گذاری‌شده</span>
          <span className={s.statValue}>
            <CountUp value={totalTargeted} duration={700} locale="fa-IR" />
          </span>
          <span className={s.statMeta}>
            <span className={s.statPct}>{fmtPercent(totalTargeted, totalUsers)}٪</span> پوشش
          </span>
        </div>
        <div className={s.statBlock} data-tone="violet">
          <span className={s.statLabel}>سگمنت‌ها</span>
          <span className={s.statValue}>
            <CountUp value={initialData.audiences.length} duration={700} locale="fa-IR" />
          </span>
          <span className={s.statMeta}>سگمنت فعال</span>
        </div>
        <div className={s.statBlock} data-tone="amber">
          <span className={s.statLabel}>کمپین‌های فعال</span>
          <span className={s.statValue}>
            <CountUp value={initialData.activeCampaigns} duration={700} locale="fa-IR" />
          </span>
          <span className={s.statMeta}>در حال اجرا</span>
        </div>
      </div>

      {/* ═══ DISTRIBUTION STRIP ════════════════════════════ */}
      {initialData.distribution.length > 0 ? (
        <div className={s.distrib}>
          <div className={s.distribHead}>
            <span className={s.distribTitle}>توزیع مخاطبان</span>
            <span className={s.distribMeta}>{fmtPersian(totalUsers)} کاربر</span>
          </div>
          <div className={s.distribBar} aria-hidden>
            {initialData.distribution.map((d) => {
              const ratio = totalUsers > 0 ? d.count / totalUsers : 0;
              return (
                <span
                  key={d.id}
                  className={s.distribSeg}
                  data-tone={d.tone}
                  style={{ flexGrow: Math.max(ratio, 0.005) }}
                  title={`${d.label}: ${fmtPersian(d.count)}`}
                />
              );
            })}
          </div>
          <ul className={s.distribList}>
            {initialData.distribution.map((d) => {
              const ratio = totalUsers > 0 ? d.count / totalUsers : 0;
              return (
                <li key={d.id} className={s.distribItem} data-tone={d.tone}>
                  <span className={s.distribDot} aria-hidden />
                  <span className={s.distribLabel}>{d.label}</span>
                  <span className={s.distribCount}>{fmtPersian(d.count)}</span>
                  <span className={s.distribPct}>
                    {PERSIAN_NUM(Math.round(ratio * 1000) / 10)}٪
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* ═══ CONTROLS ═══════════════════════════════════ */}
      <div className={s.controls}>
        <div className={s.tabs} role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={s.tab}
                data-active={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                <Icon size={12} aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
        <div className={s.searchWrap}>
          <Search size={16} aria-hidden className={s.searchIcon} />
          <Input
            type="search"
            className={s.search}
            placeholder="جستجو در نام یا توضیح…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جستجو"
          />
        </div>
      </div>

      {/* ═══ GALLERY ═════════════════════════════════════ */}
      {ordered.length === 0 ? (
        <EmptyState
          title="مخاطبی یافت نشد"
          description="فیلتر یا جستجوی خود را تغییر دهید."
          icon={Users}
        />
      ) : (
        <ul className={s.gallery}>
          {ordered.map((row, idx) => {
            const Icon = getAudienceIcon(row.id);
            const hue = toneHue(row.tone);
            const coverage = totalUsers > 0 ? row.count / totalUsers : 0;
            const ratio = Math.max(0.04, Math.min(1, coverage * 2.5));
            return (
              <li key={row.id} className={s.card} data-tone={row.tone} style={{ '--aud-hue': hue } as React.CSSProperties}>
                <Link
                  href={`/dashboard/communication/audiences/${row.id}`}
                  className={s.cardLink}
                  aria-label={`جزئیات ${row.label}`}
                />
                <header className={s.cardHead}>
                  <div className={s.cardHeadMain}>
                    <span className={s.cardIcon} aria-hidden>
                      <Icon size={16} />
                    </span>
                    <div className={s.cardTitleBlock}>
                      <span className={s.cardIndex}>سگمنت {fmtPersian(idx + 1)}</span>
                      <h2 className={s.cardTitle}>{row.label}</h2>
                    </div>
                  </div>
                </header>
                <p className={s.cardDesc}>{row.description}</p>

                {/* radial visual */}
                <div className={s.visual} aria-hidden>
                  <div
                    className={s.visualArc}
                    style={{ ['--p' as string]: `${ratio * 100}%` }}
                  />
                  <div className={s.visualCore}>
                    <span className={s.visualValue}>{fmtPersian(row.count)}</span>
                    <span className={s.visualUnit}>کاربر</span>
                  </div>
                </div>

                <footer className={s.cardFoot}>
                  <div className={s.footMetric}>
                    <span className={s.footKey}>هدف‌گیری</span>
                    <span className={s.footVal}>{fmtPersian(row.targetedCount)}</span>
                  </div>
                  <div className={s.footMetric}>
                    <span className={s.footKey}>سهم</span>
                    <span className={s.footVal}>
                      {PERSIAN_NUM((coverage * 100).toFixed(1))}٪
                    </span>
                  </div>
                </footer>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
