'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronLeft,
  Filter,
  Layers,
  Plus,
  Search,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import {
  HUB_PALETTES,
  HubShell,
  type PillTabItem,
  toOklch,
} from '@/components/Dashboard/PlatformHub';
import { Section, EmptyState, Spotlight, StatCard, StatGrid, GeometricAccent } from '@/components/Dashboard/primitives';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const TABS: PillTabItem[] = [
  { id: 'all', label: 'همه', icon: <Layers size={14} aria-hidden /> },
  { id: 'all-aud', label: 'همه کاربران', icon: <Users size={14} aria-hidden /> },
  { id: 'role', label: 'بر اساس نقش', icon: <Target size={14} aria-hidden /> },
  { id: 'segment', label: 'سگمنت', icon: <Sparkles size={14} aria-hidden /> },
];

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
function toneChroma(tone: AudienceTone): number {
  return { emerald: 0.12, indigo: 0.13, amber: 0.13, violet: 0.13, cyan: 0.12, rose: 0.13 }[tone];
}

function AudienceIcon({ id }: { id: string }) {
  if (id === 'all') return <Users size={20} aria-hidden />;
  if (id.startsWith('role:')) return <Target size={20} aria-hidden />;
  return <Sparkles size={20} aria-hidden />;
}

export function AudiencesView({ initialData }: { initialData: AudiencesViewData }) {
  const [tab, setTab] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const palette = HUB_PALETTES.communication;

  // ── filtering ────────────────────────────────────────────────
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

  // ── sort for ordering ────────────────────────────────────────
  const ordered = useMemo(() => {
    return [...filtered].sort((a, b) => b.count - a.count);
  }, [filtered]);

  // ── total share (برای distribution) ──────────────────────────
  const total = initialData.totalUsers || 1;

  return (
    <HubShell
      meta={{
        eyebrow: 'مرکز ارتباطات',
        title: 'مخاطبان هدف',
        subtitle:
          'سگمنت‌ها و گروه‌های هدف. پیام را به گروه دقیق برسانید — نه به همه. هر audience یک جامعه با رفتار و حساسیت متفاوت است.',
        breadcrumb: [
          { href: '/dashboard/communication', label: 'مرکز ارتباطات' },
          { label: 'مخاطبان هدف' },
        ],
        badges: [
          { label: `${fmtPersian(initialData.audiences.length)} سگمنت فعال`, tone: 'emerald' },
          { label: 'همگام با کاربران واقعی', tone: 'indigo' },
        ],
        actions: (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/communication">
                <ChevronLeft size={14} aria-hidden />
                بازگشت به مرکز
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard/communication/announcements/new">
                <Plus size={14} aria-hidden />
                اعلان جدید
              </Link>
            </Button>
          </>
        ),
      }}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {/* ── KPI strip ──────────────────────────────────────────── */}
      <StatGrid className={s.kpiGrid} cols={4}>
        <StatCard
          label="کل کاربران"
          value={initialData.totalUsers}
          icon={Users}
          info="بر اساس نقش"
          format="persian"
        />
        <StatCard
          label="سگمنت‌ها"
          value={initialData.audiences.length}
          icon={Layers}
          info="تعریف‌شده"
          format="persian"
        />
        <StatCard
          label="ارسال‌های هدفمند"
          value={initialData.totalTargeted}
          icon={Target}
          info="در ۳۰ روز گذشته"
          format="persian"
        />
        <StatCard
          label="کمپین‌های فعال"
          value={initialData.activeCampaigns}
          icon={Sparkles}
          info="در حال ارسال"
          format="persian"
        />
      </StatGrid>

      {/* ── Distribution map (donut-like horizontal) ──────────── */}
      <Section
        title="نقشه توزیع"
        description="سهم هر نوع audience از کل کاربران. این نمودار، شناسایی gap های پوشش را ممکن می‌سازد."
        icon={Layers}
      >
        <Card className={s.distCard}>
          <Spotlight tone="emerald" />
          <GeometricAccent variant="wave" position="tr" />
          <CardContent className={s.distContent}>
            <div className={s.distStack} role="img" aria-label="نقشه توزیع سگمنت‌ها">
              {initialData.distribution.map((seg) => {
                const pct = (seg.count / total) * 100;
                return (
                  <div
                    key={seg.id}
                    className={s.distSeg}
                    data-tone={seg.tone}
                    style={{ width: `${Math.max(8, pct)}%` }}
                    title={`${seg.label}: ${fmtPersian(seg.count)} (${fmtPersian(Math.round(pct))}٪)`}
                  >
                    <span className={s.distSegLabel}>{seg.label}</span>
                    <span className={s.distSegVal}>{fmtPersian(seg.count)}</span>
                  </div>
                );
              })}
            </div>
            <ul className={s.distLegend}>
              {initialData.distribution.map((seg) => (
                <li key={seg.id}>
                  <span className={s.distDot} data-tone={seg.tone} />
                  <span className={s.distLegendLabel}>{seg.label}</span>
                  <span className={s.distLegendVal}>
                    {fmtPersian(seg.count)} کاربر · {fmtPersian(Math.round((seg.count / total) * 100))}٪
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Section>

      {/* ── Audiences grid + search ──────────────────────────── */}
      <Section
        title="همه سگمنت‌ها"
        description="روی یک audience کلیک کنید تا کمپین هدفمند برای آن بسازید."
        actions={
          <div className={s.searchWrap}>
            <Search size={14} aria-hidden className={s.searchIcon} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو در سگمنت‌ها..."
              className={s.searchInput}
              aria-label="جستجوی سگمنت"
            />
          </div>
        }
        icon={Filter}
      >
        {ordered.length === 0 ? (
          <EmptyState
            title="سگمنتی یافت نشد"
            description="جستجوی خود را تغییر دهید یا فیلتر فعلی را پاک کنید."
            icon={Search}
          />
        ) : (
          <ul className={s.audGrid}>
            {ordered.map((aud) => {
              const pct = fmtPercent(aud.count, total);
              const hue = toneHue(aud.tone);
              const chroma = toneChroma(aud.tone);
              return (
                <li key={aud.id} className={s.audItem}>
                  <Card className={s.audCard}>
                    <Spotlight tone={aud.tone === 'rose' ? 'rose' : aud.tone} />
                    <CardContent className={s.audContent}>
                      <div className={s.audHeader}>
                        <span
                          className={s.audGlyph}
                          data-tone={aud.tone}
                          style={{ background: `color-mix(in oklab, oklch(60% ${chroma} ${hue}) 14%, transparent)` }}
                        >
                          <AudienceIcon id={aud.id} />
                        </span>
                        <div className={s.audIdBlock}>
                          <span className={s.audLabel}>{aud.label}</span>
                          <span className={s.audDesc}>{aud.description}</span>
                        </div>
                      </div>

                      <div className={s.audStats}>
                        <div className={s.audStat}>
                          <span className={s.audStatKey}>کاربران</span>
                          <span className={s.audStatVal}>{fmtPersian(aud.count)}</span>
                        </div>
                        <div className={s.audStat}>
                          <span className={s.audStatKey}>سهم</span>
                          <span className={s.audStatVal}>{fmtPersian(pct)}٪</span>
                        </div>
                        <div className={s.audStat}>
                          <span className={s.audStatKey}>ارسال‌ها</span>
                          <span className={s.audStatVal}>{fmtPersian(aud.targetedCount)}</span>
                        </div>
                      </div>

                      <div className={s.audBar}>
                        <span
                          className={s.audBarFill}
                          style={{
                            width: `${Math.max(2, pct)}%`,
                            background: `oklch(60% ${chroma} ${hue})`,
                          }}
                        />
                      </div>

                      <div className={s.audActions}>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/communication/audiences/${aud.id}`}>
                            مشاهده جزئیات
                            <ArrowRight size={12} aria-hidden />
                          </Link>
                        </Button>
                        <Button size="sm" asChild>
                          <Link
                            href={{
                              pathname: '/dashboard/communication/campaigns/new',
                              query: { audience: aud.id },
                            }}
                          >
                            <Plus size={12} aria-hidden />
                            ارسال کمپین
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </HubShell>
  );
}
