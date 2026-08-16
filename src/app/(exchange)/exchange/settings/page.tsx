/**
 * /exchange/settings — نمای کلی تنظیمات (P2026 redesign)
 *
 * خلاصه‌ای از وضعیت پیکربندی صرافی + quick actions به sub-routes.
 * این صفحه server component است.
 *
 * Modernized: PageHeader + Section + QuickActionRow primitives.
 */

// Module-level Intl singleton — created once at module load
const _faNum = new Intl.NumberFormat('fa-IR');

import { getExchangeForUser } from '@/actions/exchanges';
import { getExchangeStaff } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader, QuickActionRow, Section } from '@/components/Dashboard/primitives';
import { BookmarkButton } from '@/components/Dashboard/primitives/BookmarkButton';
import { CheckCircle2, Clock, Cog, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import s from './_components/SettingsOverview.module.css';

export const metadata = { title: 'تنظیمات صرافی' };

export default async function SettingsIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/settings');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/forbidden');
  if (!['OWNER', 'MANAGER'].includes(membership.staffRole)) {
    redirect('/exchange/dashboard');
  }

  const { exchange, staffRole } = membership;
  const staff = await getExchangeStaff(exchange.id).catch(() => []);
  const canEdit = staffRole === 'OWNER' || staffRole === 'MANAGER';

  // محاسبه status flags
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(exchange.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const staffCount = staff.length;
  const activeStaff = staff.length; // getExchangeStaff already filters revokedAt: null

  // Quick action items
  const quickActions = [
    {
      href: '/exchange/settings/operations',
      icon: <Cog size={14} />,
      label: 'عملیات و کارمزد',
      tone: 'default' as const,
    },
    {
      href: '/exchange/settings/working-hours',
      icon: <Clock size={14} />,
      label: 'ساعات کاری',
      tone: 'amber' as const,
    },
    {
      href: '/exchange/settings/security',
      icon: <ShieldCheck size={14} />,
      label: 'امنیت و دسترسی',
      tone: 'violet' as const,
      badge: activeStaff,
    },
    {
      href: '/exchange/profile',
      icon: <Users size={14} />,
      label: 'هویت عمومی',
      tone: 'cyan' as const,
    },
  ];

  return (
    <div className={s.root}>
      {/* ── PageHeader — unified ──────────────────────────────────── */}
      <PageHeader
        breadcrumb={[{ href: '/exchange/dashboard', label: 'داشبورد صراف' }, { label: 'تنظیمات' }]}
        title={`پیکربندی ${exchange.displayName ?? exchange.name}`}
        description="تنظیمات عملیاتی، امنیتی و ساعات کاری صرافی"
        icon="settings"
        accent="emerald"
        variant="compact"
        meta={[
          { label: 'آخرین تغییر', value: `${_faNum.format(daysSinceUpdate)} روز پیش` },
          { label: 'اعضای فعال', value: `${_faNum.format(activeStaff)}/${staffCount}` },
        ]}
        actions={<BookmarkButton pageKey="exchange-settings" />}
      />

      {/* ── Quick Actions Row ─────────────────────────────────────── */}
      <Section title="دسترسی سریع" subtitle="بخش‌های تنظیمات">
        <QuickActionRow items={quickActions} />
      </Section>

      {/* ── Quick links to sub-routes (legacy grid — kept for now) ── */}
      <div className={s.grid}>
        <Link href="/exchange/settings/operations" className={s.tile}>
          <div className={s.tileHead}>
            <span className={`${s.tileIcon} ${s.tone_accent}`} aria-hidden>
              <Cog size={16} strokeWidth={1.85} />
            </span>
          </div>
          <h2 className={s.tileTitle}>عملیات و کارمزد</h2>
          <p className={s.tileDesc}>KYC، سقف تراکنش روزانه و درصد کارمزدها</p>
          <div className={s.tileMeta}>
            <span className={s.metaDot} aria-hidden />
            <span>{canEdit ? 'قابل ویرایش' : 'فقط مشاهده'}</span>
          </div>
        </Link>

        <Link href="/exchange/settings/working-hours" className={s.tile}>
          <div className={s.tileHead}>
            <span className={`${s.tileIcon} ${s.tone_gold}`} aria-hidden>
              <Clock size={16} strokeWidth={1.85} />
            </span>
          </div>
          <h2 className={s.tileTitle}>ساعات کاری</h2>
          <p className={s.tileDesc}>برنامه هفتگی و روزهای تعطیل</p>
          <div className={s.tileMeta}>
            <span className={s.metaDot} aria-hidden />
            <span>{canEdit ? 'قابل ویرایش' : 'فقط مشاهده'}</span>
          </div>
        </Link>

        <Link href="/exchange/settings/security" className={s.tile}>
          <div className={s.tileHead}>
            <span className={`${s.tileIcon} ${s.tone_info}`} aria-hidden>
              <ShieldCheck size={16} strokeWidth={1.85} />
            </span>
          </div>
          <h2 className={s.tileTitle}>امنیت و دسترسی</h2>
          <p className={s.tileDesc}>اعضا، نقش‌ها و نشست‌های فعال</p>
          <div className={s.tileMeta}>
            <span className={s.metaDot} aria-hidden />
            <span>{_faNum.format(activeStaff)} عضو فعال</span>
          </div>
        </Link>

        <Link href="/exchange/profile" className={s.tile}>
          <div className={s.tileHead}>
            <span className={`${s.tileIcon} ${s.tone_violet}`} aria-hidden>
              <Users size={16} />
            </span>
          </div>
          <h2 className={s.tileTitle}>هویت عمومی</h2>
          <p className={s.tileDesc}>نام، لوگو و اطلاعات تماس — در صفحه عمومی نمایش داده می‌شود</p>
          <div className={s.tileMeta}>
            <span className={s.metaDot} aria-hidden />
            <span>پیوند به پروفایل</span>
          </div>
        </Link>
      </div>

      {/* ── Checklist for completion ──────────────────────────────── */}
      <Section title="چک‌لیست راه‌اندازی" subtitle="وضعیت پیکربندی صرافی">
        <ul className={s.checkList}>
          <ChecklistItem done={Boolean(exchange.logoUrl)} label="لوگوی صرافی تنظیم شده" />
          <ChecklistItem
            done={Boolean(exchange.phone && exchange.email)}
            label="اطلاعات تماس کامل"
          />
          <ChecklistItem
            done={Boolean(exchange.city && exchange.address)}
            label="آدرس فیزیکی ثبت شده"
          />
          <ChecklistItem done={staffCount >= 2} label="حداقل دو عضو فعال" />
          <ChecklistItem done={Boolean(exchange.website)} label="وبسایت معرفی‌شده" />
        </ul>
      </Section>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className={`${s.checkItem} ${done ? s.checkItemDone : ''}`}>
      <span className={s.checkMark} aria-hidden>
        {done ? <CheckCircle2 size={14} /> : <span className="opacity-40">○</span>}
      </span>
      <span>{label}</span>
    </li>
  );
}
