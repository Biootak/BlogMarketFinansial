/**
 * /exchange/settings — نمای کلی تنظیمات
 *
 * خلاصه‌ای از وضعیت پیکربندی صرافی + quick actions به sub-routes.
 * این صفحه server component است.
 */

// Module-level Intl singleton — created once at module load
const _faNum = new Intl.NumberFormat('fa-IR');

import { getExchangeForUser } from '@/actions/exchanges';
import { getExchangeStaff } from '@/actions/exchanges';
import { auth } from '@/auth';
import { ChevronLeft, Clock, Cog, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import s from './_components/SettingsOverview.module.css';

export const metadata = { title: 'تنظیمات صرافی' };

export default async function SettingsIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/settings');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');
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

  return (
    <div className={s.root}>
      {/* ── Hero status card ──────────────────────────────────────── */}
      <section className={s.hero}>
        <div className={s.heroLeft}>
          <span className={s.eyebrow}>
            <Cog size={11} strokeWidth={2.5} aria-hidden />
            Workspace
          </span>
          <h1 className={s.heroTitle}>پیکربندی عملیاتی {exchange.displayName ?? exchange.name}</h1>
          <p className={s.heroDesc}>
            از اینجا تنظیمات عملیاتی (KYC، کارمزد، سقف تراکنش)، امنیتی (اعضا و نقش‌ها) و ساعات کاری
            صرافی را مدیریت کنید. تغییرات بلافاصله در سیستم اعمال می‌شود.
          </p>
        </div>
        <div className={s.heroStats}>
          <div className={s.statCell}>
            <span className={s.statLabel}>آخرین تغییر</span>
            <span className={s.statValue}>{_faNum.format(daysSinceUpdate)} روز پیش</span>
          </div>
          <span className={s.statSep} aria-hidden />
          <div className={s.statCell}>
            <span className={s.statLabel}>اعضای فعال</span>
            <span className={s.statValue}>
              {_faNum.format(activeStaff)}
              <span className={s.statDim}>/{staffCount}</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Quick links to sub-routes ─────────────────────────────── */}
      <div className={s.grid}>
        <Link href="/exchange/settings/operations" className={s.tile}>
          <div className={s.tileHead}>
            <span className={`${s.tileIcon} ${s.tone_accent}`} aria-hidden>
              <Cog size={16} strokeWidth={1.85} />
            </span>
            <ChevronLeft size={14} className={s.tileArrow} aria-hidden />
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
            <ChevronLeft size={14} className={s.tileArrow} aria-hidden />
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
            <ChevronLeft size={14} className={s.tileArrow} aria-hidden />
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
              <span style={{ fontSize: 14, fontWeight: 800 }}>ID</span>
            </span>
            <ChevronLeft size={14} className={s.tileArrow} aria-hidden />
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
      <section className={s.checklist}>
        <h2 className={s.checklistTitle}>چک‌لیست راه‌اندازی</h2>
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
      </section>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className={`${s.checkItem} ${done ? s.checkItemDone : ''}`}>
      <span className={s.checkMark} aria-hidden>
        {done ? '✓' : '○'}
      </span>
      <span>{label}</span>
    </li>
  );
}
