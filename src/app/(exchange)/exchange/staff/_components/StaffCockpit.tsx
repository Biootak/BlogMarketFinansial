'use client';

/**
 * StaffCockpit — orchestrator اصلی صفحه تیم.
 *
 * ساختار:
 *  1. Hero با Team Orbit (signature moment)
 *  2. KPI ribbon
 *  3. Tabs (نمای کلی / دسترسی‌ها / لاگ فعالیت)
 *  4. Add panel (اگر write)
 *  5. Directory (search + filter + cards)
 *  6. Activity timeline (5 آیتم اخیر)
 *  7. Footer link
 *
 * state مدیریت optimistic برای role change / revoke:
 *  - روی optimistic update، UI فوری به‌روز می‌شود و در صورت خطا rollback.
 */

import { Activity, ArrowLeft, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/components/Dashboard/primitives/ConfirmDialog';
import {
  revokeExchangeStaff,
  updateStaffRole,
  type ExchangeStaffRow,
  type StaffActivityItem,
  type StaffMetrics,
} from '@/actions/exchanges';
import { StaffActivityTimeline } from './StaffActivityTimeline';
import { StaffAddPanel } from './StaffAddPanel';
import { StaffDirectory } from './StaffDirectory';
import { StaffKpiRibbon } from './StaffKpiRibbon';
import { StaffOrbit } from './StaffOrbit';
import { StaffTabs } from './StaffTabs';
import s from './StaffCockpit.module.css';

interface Props {
  exchangeId: string;
  exchangeName: string;
  currentUserId: string;
  canWrite: boolean;
  canRevoke: boolean;
  members: ExchangeStaffRow[];
  metrics: StaffMetrics;
  activity: StaffActivityItem[];
}

export function StaffCockpit({
  exchangeId,
  exchangeName,
  currentUserId,
  canWrite,
  canRevoke,
  members: initialMembers,
  metrics,
  activity,
}: Props) {
  const [members, setMembers] = useState<ExchangeStaffRow[]>(initialMembers);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ExchangeStaffRow | null>(null);

  // helper: replace یک عضو در لیست
  const patchMember = useCallback((id: string, patch: Partial<ExchangeStaffRow>) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const handleRoleChange = useCallback(
    async (id: string, role: 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER') => {
      const target = members.find((m) => m.id === id);
      if (!target || target.role === role) return;
      setUpdatingId(id);
      const prev = target.role;
      // optimistic
      patchMember(id, { role });
      const result = await updateStaffRole(id, exchangeId, role);
      setUpdatingId(null);
      if (!result.success) {
        patchMember(id, { role: prev });
        window.alert(result.error.message);
      }
    },
    [members, exchangeId, patchMember],
  );

  const handleRevoke = useCallback(async () => {
    if (!revokeTarget) return;
    setUpdatingId(revokeTarget.id);
    const result = await revokeExchangeStaff(revokeTarget.id, exchangeId);
    setUpdatingId(null);
    if (result.success) {
      setMembers((prev) => prev.filter((m) => m.id !== revokeTarget.id));
      setRevokeTarget(null);
    } else {
      window.alert(result.error.message);
      setRevokeTarget(null);
    }
  }, [revokeTarget, exchangeId]);

  const handleAdded = useCallback((member: ExchangeStaffRow) => {
    setMembers((prev) => {
      // اگر قبلاً revoked شده، جایگزین کن
      const without = prev.filter((m) => m.userId !== member.userId);
      return [member, ...without];
    });
  }, []);

  return (
    <div className={s.root}>
      {/* Hero — Team Orbit */}
      <section className={s.hero} aria-label="معرفی تیم">
        <div className={s.heroMain}>
          <span className={s.heroEyebrow}>
            <span className={s.heroLive} aria-hidden />
            تیم صرافی · {exchangeName}
          </span>
          <h1 className={s.heroTitle}>
            سکان صرافی در دستان {metrics.total.toLocaleString('fa-IR')} نفر
          </h1>
          <p className={s.heroSub}>
            اعضای فعال، دعوت‌های در انتظار و دسترسی‌ها را در یک نگاه ببینید. مالک
            مرکز ثقل تیم است و هر تغییر نقش فوراً در سلسله‌مراتب نمایش داده می‌شود.
          </p>
          <div className={s.heroMetaRow}>
            <span className={s.heroMeta}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--at-accent)' }} />
              <strong>{metrics.byRole.OWNER.toLocaleString('fa-IR')}</strong> مالک
            </span>
            <span className={s.heroMeta}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--at-gold)' }} />
              <strong>{metrics.byRole.MANAGER.toLocaleString('fa-IR')}</strong> مدیر
            </span>
            <span className={s.heroMeta}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--at-info)' }} />
              <strong>{metrics.byRole.STAFF.toLocaleString('fa-IR')}</strong> کارمند
            </span>
            <span className={s.heroMeta}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'transparent', border: '1px dashed var(--at-fg-faint)' }} />
              <strong>{metrics.byRole.VIEWER.toLocaleString('fa-IR')}</strong> مشاهده‌گر
            </span>
          </div>
        </div>

        <div className={s.heroOrbitCol}>
          <StaffOrbit
            members={members}
            totalCount={members.length}
            exchangeName={exchangeName}
          />
        </div>
      </section>

      {/* KPI ribbon */}
      <StaffKpiRibbon metrics={metrics} />

      {/* Tabs */}
      <div className={s.tabsRow}>
        <StaffTabs activityCount={metrics.activeLast30d} />
        {canWrite && (
          <div className={s.tabsRight}>
            <Link
              href="/exchange/staff/permissions"
              className={s.filterPill}
              aria-label="مشاهده ماتریس دسترسی‌ها"
            >
              <BarChart3 size={12} strokeWidth={2} aria-hidden />
              ماتریس دسترسی‌ها
              <ArrowLeft size={11} strokeWidth={2} aria-hidden />
            </Link>
          </div>
        )}
      </div>

      {/* Two-column main: directory + (add panel + recent activity) */}
      <div className={s.dualGrid}>
        <div className={s.panel}>
          <div className={s.panelHead}>
            <h2 className={s.panelTitle}>فهرست اعضا</h2>
            <span className={s.panelMeta}>
              {members.length.toLocaleString('fa-IR')} عضو فعال
            </span>
          </div>
          <StaffDirectory
            members={members}
            currentUserId={currentUserId}
            canWrite={canWrite}
            canRevoke={canRevoke}
            onRoleChange={handleRoleChange}
            onRevoke={setRevokeTarget}
            updatingId={updatingId}
          />
        </div>

        <div className={s.col} style={{ gap: 'var(--ds-space-4)' }}>
          {canWrite && <StaffAddPanel exchangeId={exchangeId} onAdded={handleAdded} />}

          <div className={s.panel}>
            <div className={s.panelHead}>
              <h2 className={s.panelTitle}>
                <Activity size={13} strokeWidth={2} aria-hidden style={{ color: 'var(--at-accent)' }} />
                فعالیت‌های اخیر
              </h2>
              <Link href="/exchange/staff/activity" className={s.footerLink}>
                مشاهده همه
                <ArrowLeft size={11} strokeWidth={2} aria-hidden />
              </Link>
            </div>
            <StaffActivityTimeline items={activity} limit={6} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={s.footer}>
        <span>
          {metrics.activeLast30d.toLocaleString('fa-IR')} نفر در ۳۰ روز اخیر فعال بوده‌اند
        </span>
        <span className={s.footerSep}>·</span>
        <span>
          {metrics.pendingInvitations.toLocaleString('fa-IR')} دعوت در انتظار
        </span>
        <span className={s.footerSep}>·</span>
        <Link href="/exchange/dashboard" className={s.footerLink}>
          بازگشت به داشبورد
        </Link>
      </footer>

      {/* Revoke confirmation dialog */}
      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="لغو دسترسی عضو"
        description={
          revokeTarget
            ? `دسترسی «${revokeTarget.user.name ?? revokeTarget.user.email}» به این صرافی لغو می‌شود. این عملیات قابل بازگشت نیست.`
            : ''
        }
        confirmLabel="لغو دسترسی"
        cancelLabel="انصراف"
        variant="danger"
        loading={updatingId === revokeTarget?.id}
        onConfirm={() => void handleRevoke()}
      />
    </div>
  );
}
