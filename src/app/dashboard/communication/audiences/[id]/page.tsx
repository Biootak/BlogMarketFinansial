import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

import { auth } from '@/auth';
import { ArrowRight, ChevronLeft, Sparkles, Target, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getAudiences, getCommunicationSnapshot } from '@/lib/communication';
import { Button } from '@/components/ui/button';
import { CountUp, Spotlight } from '@/components/Dashboard/primitives';
import { LiveDot } from '@/components/Dashboard/PlatformHub';
import s from './AudienceDetail.module.css';

export const dynamic = 'force-dynamic';

type AudienceTone = 'emerald' | 'indigo' | 'amber' | 'violet' | 'cyan' | 'rose';

const TONE_HEX: Record<AudienceTone, string> = {
  emerald: 'oklch(60% 0.12 165)',
  indigo: 'oklch(60% 0.13 245)',
  amber: 'oklch(70% 0.13 70)',
  violet: 'oklch(58% 0.13 290)',
  cyan: 'oklch(60% 0.12 210)',
  rose: 'oklch(60% 0.13 25)',
};

function toneHue(tone: AudienceTone): number {
  return { emerald: 165, indigo: 245, amber: 70, violet: 290, cyan: 210, rose: 25 }[tone];
}

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));
const fmtPercent = (n: number) => `${PERSIAN_NUM((n * 100).toFixed(1))}٪`;

const CHANNEL_LABELS: Record<'email' | 'sms' | 'push', string> = {
  email: 'EMAIL',
  sms: 'SMS',
  push: 'PUSH',
};

function getAudienceIcon(id: string): LucideIcon {
  if (id === 'all') return Users;
  if (id.startsWith('role:')) return Target;
  return Sparkles;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  const audiences = audiencesResult.data;
  const audience = audiences.rows.find((r) => r.id === id);
  if (!audience) {
    notFound();
  }
  const totalUsers = audiences.totalUsers;

  const tone = audience.tone as AudienceTone;
  const hue = toneHue(tone);
  const Icon = getAudienceIcon(audience.id);

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

  const totalSent = campaigns.reduce((sum, c) => sum + c.stats.sent, 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + c.stats.opened, 0);
  const totalClicked = campaigns.reduce((sum, c) => sum + c.stats.clicked, 0);
  const openRate = totalSent > 0 ? totalOpened / totalSent : 0;
  const clickRate = totalSent > 0 ? totalClicked / totalSent : 0;
  const share = totalUsers > 0 ? audience.count / totalUsers : 0;

  // ── distribution by channel ──
  const channelDistribution = (['email', 'push', 'sms'] as const).map((ch) => {
    const sent = campaigns
      .filter((c) => c.channel === ch)
      .reduce((s, c) => s + c.stats.sent, 0);
    return { channel: ch, sent };
  });
  const totalChannelSent = Math.max(channelDistribution.reduce((s, c) => s + c.sent, 0), 1);

  return (
    <div className={s.page} dir="rtl">
      {/* ═══ COVER ═══════════════════════════════════════ */}
      <header className={s.cover} data-tone={tone}>
        <Spotlight tone={tone === 'rose' ? 'rose' : tone} size={520} className={s.coverSpot} />
        <nav className={s.crumbs} aria-label="مسیر">
          <Link href="/dashboard" className={s.crumbLink}>داشبورد</Link>
          <span className={s.crumbSep}>/</span>
          <Link href="/dashboard/communication" className={s.crumbLink}>مرکز ارتباطات</Link>
          <span className={s.crumbSep}>/</span>
          <Link href="/dashboard/communication/audiences" className={s.crumbLink}>مخاطبان هدف</Link>
          <span className={s.crumbSep}>/</span>
          <span className={s.crumbCurrent}>{audience.label}</span>
        </nav>

        <div className={s.coverMain}>
          <div className={s.coverMainLeft}>
            <span className={s.glyph} aria-hidden>
              <Icon size={20} />
            </span>
            <span className={s.statusPill} data-tone={tone}>
              <LiveDot tone={tone} size="xs" />
              سگمنت فعال
            </span>
            <h1 className={s.title}>{audience.label}</h1>
            <p className={s.lead}>{audience.description}</p>
          </div>
          <div className={s.coverActions}>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/communication/audiences">
                <ChevronLeft size={14} aria-hidden />
                بازگشت
              </Link>
            </Button>
            <Button asChild>
              <Link
                href={{
                  pathname: '/dashboard/communication/announcements/new',
                  query: { audience: audience.id },
                }}
              >
                <ArrowRight size={14} aria-hidden />
                ارسال اعلان
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ═══ STAT STRIP ════════════════════════════════════ */}
      <div className={s.statStrip}>
        <div className={s.statBlock} data-tone={tone}>
          <span className={s.statLabel}>کاربران</span>
          <span className={s.statValue}>
            <CountUp value={audience.count} duration={700} locale="fa-IR" />
          </span>
          <span className={s.statMeta}>{fmtPercent(share)} سهم</span>
        </div>
        <div className={s.statBlock} data-tone="emerald">
          <span className={s.statLabel}>ارسال‌ها</span>
          <span className={s.statValue}>
            <CountUp value={totalSent} duration={700} locale="fa-IR" />
          </span>
          <span className={s.statMeta}>پیام</span>
        </div>
        <div className={s.statBlock} data-tone="indigo">
          <span className={s.statLabel}>نرخ باز شدن</span>
          <span className={s.statValue}>{fmtPercent(openRate)}</span>
          <span className={s.statMeta}>{fmtPersian(totalOpened)} مورد</span>
        </div>
        <div className={s.statBlock} data-tone="violet">
          <span className={s.statLabel}>نرخ کلیک</span>
          <span className={s.statValue}>{fmtPercent(clickRate)}</span>
          <span className={s.statMeta}>{fmtPersian(totalClicked)} مورد</span>
        </div>
      </div>

      {/* ═══ CHANNEL DISTRIBUTION ════════════════════════ */}
      {totalSent > 0 ? (
        <div className={s.channelStrip}>
          <div className={s.channelStripHead}>
            <span className={s.channelStripTitle}>توزیع کانال</span>
            <span className={s.channelStripMeta}>{fmtPersian(totalSent)} ارسال</span>
          </div>
          <div className={s.channelRow}>
            {channelDistribution.map((c) => {
              const ratio = Math.max(0.04, c.sent / totalChannelSent);
              return (
                <div
                  key={c.channel}
                  className={s.channelCell}
                  data-channel={c.channel}
                  style={{ flexGrow: ratio }}
                >
                  <span className={s.channelLabel}>{CHANNEL_LABELS[c.channel]}</span>
                  <span className={s.channelValue}>{fmtPersian(c.sent)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ═══ MAIN GRID ═════════════════════════════════════ */}
      <div className={s.grid}>
        {/* campaigns */}
        <article className={s.article}>
          <header className={s.articleHead}>
            <span className={s.articleEyebrow}>کمپین‌های هدفمند</span>
            <span className={s.articleMeta}>{fmtPersian(campaigns.length)} مورد</span>
          </header>
          {campaigns.length === 0 ? (
            <div className={s.empty}>
              <Icon size={20} aria-hidden />
              <p>هنوز کمپینی به این سگمنت ارسال نشده.</p>
            </div>
          ) : (
            <ul className={s.list}>
              {campaigns.slice(0, 8).map((c) => {
                const cOpen = c.stats.sent > 0 ? c.stats.opened / c.stats.sent : 0;
                return (
                  <li key={c.id} className={s.row} data-channel={c.channel}>
                    <Link
                      href={`/dashboard/communication/campaigns/${c.id}`}
                      className={s.rowLink}
                      aria-label={`جزئیات ${c.name}`}
                    />
                    <span className={s.rowGlyph}>{CHANNEL_LABELS[c.channel]}</span>
                    <div className={s.rowBody}>
                      <span className={s.rowName}>{c.name}</span>
                      <span className={s.rowSub}>{c.subject ?? c.body.slice(0, 80)}</span>
                    </div>
                    <div className={s.rowMeta}>
                      <span className={s.rowStat}>
                        <span className={s.rowStatKey}>ارسال</span>
                        <span className={s.rowStatVal}>{fmtPersian(c.stats.sent)}</span>
                      </span>
                      <span className={s.rowStat}>
                        <span className={s.rowStatKey}>باز</span>
                        <span className={s.rowStatVal}>{fmtPercent(cOpen)}</span>
                      </span>
                    </div>
                    <time className={s.rowTime}>
                      {formatDateTime(c.completedAt ?? c.startedAt ?? c.scheduledAt ?? c.createdAt)}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}

          {announcements.length > 0 ? (
            <header className={s.articleHead} style={{ marginTop: 'var(--ds-space-4, 1rem)' }}>
              <span className={s.articleEyebrow}>اعلان‌های هدفمند</span>
              <span className={s.articleMeta}>{fmtPersian(announcements.length)} مورد</span>
            </header>
          ) : null}
          {announcements.length > 0 ? (
            <ul className={s.list}>
              {announcements.slice(0, 6).map((a) => (
                <li key={a.id} className={s.row}>
                  <Link
                    href={`/dashboard/communication/announcements/${a.id}`}
                    className={s.rowLink}
                    aria-label={`جزئیات ${a.title}`}
                  />
                  <span className={s.rowGlyph} data-channel="ann">
                    A
                  </span>
                  <div className={s.rowBody}>
                    <span className={s.rowName}>{a.title}</span>
                    <span className={s.rowSub}>{a.body.slice(0, 80)}</span>
                  </div>
                  <div className={s.rowMeta}>
                    <span className={s.rowStat}>
                      <span className={s.rowStatKey}>کانال</span>
                      <span className={s.rowStatVal}>{a.channels.length}</span>
                    </span>
                  </div>
                  <time className={s.rowTime}>
                    {formatDateTime(a.publishedAt ?? a.scheduledAt ?? a.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        {/* aside */}
        <aside className={s.aside}>
          <section className={s.asideSection} data-tone={tone}>
            <span className={s.asideEyebrow}>شناسه سگمنت</span>
            <code className={s.asideCode}>{audience.id}</code>
          </section>

          <section className={s.asideSection}>
            <span className={s.asideEyebrow}>مخاطب</span>
            <div className={s.asideBig}>
              <Users size={16} aria-hidden />
              <span>{fmtPersian(audience.count)} کاربر</span>
            </div>
            <span className={s.asideHint}>
              {fmtPercent(share)} از کل {fmtPersian(totalUsers)} کاربر
            </span>
          </section>

          <section className={s.asideSection}>
            <span className={s.asideEyebrow}>رنگ سگمنت</span>
            <div className={s.colorBlock} data-tone={tone}>
              <span className={s.colorBlockLabel}>hue {hue}</span>
              <span className={s.colorBlockHex}>{TONE_HEX[tone]}</span>
            </div>
          </section>

          {audience.targetedCount > 0 ? (
            <section className={s.asideSection}>
              <span className={s.asideEyebrow}>ارسال‌های انجام‌شده</span>
              <div className={s.asideBig}>
                <Sparkles size={16} aria-hidden />
                <span>{fmtPersian(audience.targetedCount)} پیام</span>
              </div>
              <span className={s.asideHint}>از زمان شروع ثبت</span>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
