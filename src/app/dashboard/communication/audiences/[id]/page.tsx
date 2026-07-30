import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

import { auth } from '@/auth';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { getAudiences, getCommunicationSnapshot } from '@/lib/communication';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  HUB_PALETTES,
  HubShell,
  toOklch,
} from '@/components/Dashboard/PlatformHub';
import { Section, Spotlight, GeometricAccent, StatCard, StatGrid } from '@/components/Dashboard/primitives';
import s from '../_components/Audiences.module.css';

export const dynamic = 'force-dynamic';

const TONE_HEX: Record<string, string> = {
  emerald: 'oklch(60% 0.12 165)',
  indigo: 'oklch(60% 0.13 245)',
  amber: 'oklch(70% 0.13 70)',
  violet: 'oklch(58% 0.13 290)',
  cyan: 'oklch(60% 0.12 210)',
  rose: 'oklch(60% 0.13 25)',
};

function toneHue(tone: string): number {
  return { emerald: 165, indigo: 245, amber: 70, violet: 290, cyan: 210, rose: 25 }[tone] ?? 245;
}

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));

export default async function AudienceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth?callbackUrl=/dashboard/communication/audiences/${id}`);
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const [audiencesResult, snapshotResult] = await Promise.all([
    getAudiences(),
    getCommunicationSnapshot(),
  ]);
  if (!audiencesResult.success || !audiencesResult.data) {
    notFound();
  }
  const audience = audiencesResult.data.rows.find((r) => r.id === id);
  if (!audience) {
    notFound();
  }

  const snapshot = snapshotResult.success ? snapshotResult.data : null;
  const announcements = snapshot?.announcements.filter((a) => {
    if (audience.id === 'all') return a.audience === 'all';
    if (audience.id.startsWith('role:')) return a.audience === 'role';
    if (audience.id === 'segment') return a.audience === 'segment';
    return false;
  }) ?? [];
  const campaigns = snapshot?.campaigns.filter((c) => {
    if (audience.id === 'all') return c.audience === 'all';
    if (audience.id.startsWith('role:')) return c.audience === 'role';
    if (audience.id === 'segment') return c.audience === 'segment';
    return false;
  }) ?? [];

  const totalSent = campaigns.reduce((s, c) => s + c.stats.sent, 0);
  const totalOpened = campaigns.reduce((s, c) => s + c.stats.opened, 0);
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0;

  const hue = toneHue(audience.tone);

  return (
    <HubShell
      meta={{
        eyebrow: 'مرکز ارتباطات · مخاطبان هدف',
        title: audience.label,
        subtitle: audience.description,
        breadcrumb: [
          { href: '/dashboard/communication', label: 'مرکز ارتباطات' },
          { href: '/dashboard/communication/audiences', label: 'مخاطبان هدف' },
          { label: audience.label },
        ],
        badges: [
          { label: 'سگمنت فعال', tone: audience.tone === 'rose' ? 'rose' : audience.tone as 'emerald' | 'indigo' | 'amber' | 'violet' },
        ],
        actions: (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/communication/audiences">
                <ChevronLeft size={14} aria-hidden />
                بازگشت به فهرست
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link
                href={{
                  pathname: '/dashboard/communication/announcements/new',
                  query: { audience: audience.kind === 'role' ? `role:${audience.id}` : audience.id },
                }}
              >
                <ArrowRight size={14} aria-hidden />
                ارسال اعلان به این سگمنت
              </Link>
            </Button>
          </>
        ),
      }}
    >
      <StatGrid cols={4} className={s.kpiGrid}>
        <StatCard label="کاربران" value={audience.count} format="persian" />
        <StatCard label="اعلان‌های هدفمند" value={announcements.length} format="persian" />
        <StatCard label="کمپین‌های هدفمند" value={campaigns.length} format="persian" />
        <StatCard label="نرخ باز شدن" value={openRate} format="percent" />
      </StatGrid>

      <Section title="جزئیات" description="اعلان‌ها و کمپین‌های هدفمند این سگمنت.">
        <Card className={s.audCard}>
          <Spotlight tone={audience.tone === 'rose' ? 'rose' : audience.tone as 'emerald' | 'indigo' | 'amber' | 'violet'} />
          <GeometricAccent variant="dot" position="br" />
          <CardContent className={s.audContent}>
            <div className={s.audStats}>
              <div className={s.audStat}>
                <span className={s.audStatKey}>شناسه</span>
                <span className={s.audStatVal}>{audience.id}</span>
              </div>
              <div className={s.audStat}>
                <span className={s.audStatKey}>کاربران</span>
                <span className={s.audStatVal}>{fmtPersian(audience.count)}</span>
              </div>
              <div className={s.audStat}>
                <span className={s.audStatKey}>ارسال‌های انجام‌شده</span>
                <span className={s.audStatVal}>{fmtPersian(audience.targetedCount)}</span>
              </div>
            </div>

            <div
              className={s.audBar}
              style={{ marginBlock: '0.75rem' }}
            >
              <span
                className={s.audBarFill}
                style={{ width: '100%', background: `oklch(60% 0.12 ${hue})` }}
              />
            </div>

            <p className={s.audDesc}>
              {audience.description}. این سگمنت با رنگ بنفش/آبی از سایر سگمنت‌ها متمایز شده است
              تا در گزارش‌های cross-hub قابل شناسایی سریع باشد.
            </p>
          </CardContent>
        </Card>
      </Section>

      {campaigns.length > 0 ? (
        <Section title="کمپین‌های اخیر" description="کمپین‌هایی که این سگمنت را هدف گرفته‌اند.">
          <ul className={s.audGrid}>
            {campaigns.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Card className={s.audCard}>
                  <CardContent className={s.audContent}>
                    <div className={s.audHeader}>
                      <span
                        className={s.audGlyph}
                        style={{ background: `color-mix(in oklab, ${TONE_HEX[c.channel === 'sms' ? 'amber' : c.channel === 'push' ? 'emerald' : 'indigo']} 14%, transparent)` }}
                      >
                        {c.channel.toUpperCase()}
                      </span>
                      <div className={s.audIdBlock}>
                        <span className={s.audLabel}>{c.name}</span>
                        <span className={s.audDesc}>وضعیت: {c.status}</span>
                      </div>
                    </div>
                    <div className={s.audStats}>
                      <div className={s.audStat}>
                        <span className={s.audStatKey}>ارسال</span>
                        <span className={s.audStatVal}>{fmtPersian(c.stats.sent)}</span>
                      </div>
                      <div className={s.audStat}>
                        <span className={s.audStatKey}>باز شده</span>
                        <span className={s.audStatVal}>{fmtPersian(c.stats.opened)}</span>
                      </div>
                      <div className={s.audStat}>
                        <span className={s.audStatKey}>کلیک</span>
                        <span className={s.audStatVal}>{fmtPersian(c.stats.clicked)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </HubShell>
  );
}
