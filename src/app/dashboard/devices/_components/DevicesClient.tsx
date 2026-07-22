'use client';

/**
 * DevicesClient — 2026 Million-dollar Security Dashboard
 *
 * ویژگی‌ها:
 * - KPI strip: total / trusted / unverified / revoked
 * - device card با browser icon، IP، last seen
 * - spring micro-interactions (translateY(-1px) + scale(0.97))
 * - confirm dialog قبل از revoke
 * - باگ‌فیکس: 'VERIFIED' → 'TRUSTED' در handleTrust
 * - همه ۵ حالت: loading / empty / error / success / disabled
 */

import { type DeviceRow, revokeDevice, trustDevice } from '@/actions/deviceActions';
import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Monitor,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './DevicesClient.module.css';

type Props = { devices: DeviceRow[] };

const STATUS_MAP: Record<string, { label: string; cssClass: string }> = {
  UNVERIFIED: { label: 'تأیید نشده', cssClass: s.statusUnverified },
  TRUSTED: { label: 'معتمد', cssClass: s.statusTrusted },
  REVOKED: { label: 'لغو شده', cssClass: s.statusRevoked },
};

function isMobile(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /android|iphone|ipad|mobile/i.test(userAgent);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getBrowserName(ua: string | null): string {
  if (!ua) return 'دستگاه ناشناخته';
  if (/Chrome/i.test(ua) && !/Chromium/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Opera|OPR/i.test(ua)) return 'Opera';
  return 'مرورگر ناشناخته';
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'همین الان';
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ساعت پیش`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} روز پیش`;
  return formatDate(iso);
}

export function DevicesClient({ devices: initial }: Props) {
  const [devices, setDevices] = useState<DeviceRow[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: devices.length,
      trusted: devices.filter((d) => d.status === 'TRUSTED').length,
      unverified: devices.filter((d) => d.status === 'UNVERIFIED').length,
      revoked: devices.filter((d) => d.status === 'REVOKED').length,
    }),
    [devices],
  );

  const handleRevoke = useCallback((id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await revokeDevice(id);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'REVOKED' } : d)));
      setRevokeTarget(null);
    });
  }, []);

  const handleTrust = useCallback((id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await trustDevice(id);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      // ✅ باگ‌فیکس: 'VERIFIED' → 'TRUSTED' (enum صحیح در schema)
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'TRUSTED' } : d)));
    });
  }, []);

  return (
    <div className={s.page}>
      <PageHeader
        title="دستگاه‌های من"
        description="دستگاه‌ها و جلسه‌های فعال متصل به حسابتان را مدیریت کنید"
        eyebrow="امنیت حساب"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'دستگاه‌ها' }]}
      />

      {/* ── KPI Strip ── */}
      <div className={s.kpiStrip} aria-label="خلاصه دستگاه‌ها" aria-live="polite">
        <div className={s.kpiItem}>
          <span className={s.kpiIcon} aria-hidden>
            <Monitor size={16} />
          </span>
          <span className={s.kpiVal}>{stats.total}</span>
          <span className={s.kpiLabel}>دستگاه</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={`${s.kpiIcon} ${s.kpiIconGreen}`} aria-hidden>
            <ShieldCheck size={16} />
          </span>
          <span className={`${s.kpiVal} ${s.kpiTrusted}`}>{stats.trusted}</span>
          <span className={s.kpiLabel}>معتمد</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={`${s.kpiIcon} ${s.kpiIconAmber}`} aria-hidden>
            <Shield size={16} />
          </span>
          <span className={`${s.kpiVal} ${s.kpiUnverified}`}>{stats.unverified}</span>
          <span className={s.kpiLabel}>تأیید نشده</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={`${s.kpiIcon} ${s.kpiIconRed}`} aria-hidden>
            <ShieldOff size={16} />
          </span>
          <span className={`${s.kpiVal} ${s.kpiRevoked}`}>{stats.revoked}</span>
          <span className={s.kpiLabel}>لغو شده</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={s.errorBanner} role="alert">
          <AlertCircle size={15} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      {devices.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title="هنوز دستگاهی ثبت نشده"
          description="دستگاه‌های متصل به حسابتان بعد از اولین ورود اینجا نمایش داده می‌شوند."
        />
      ) : (
        <ul className={s.deviceList}>
          {devices.map((d, idx) => {
            const mobile = isMobile(d.userAgent);
            const statusInfo = STATUS_MAP[d.status] ?? {
              label: 'تأیید نشده',
              cssClass: s.statusUnverified,
            };
            const browserName = getBrowserName(d.userAgent);
            const relTime = getRelativeTime(d.lastSeenAt);

            return (
              <li key={d.id} className={s.deviceCard} style={{ animationDelay: `${idx * 40}ms` }}>
                {/* Device Icon */}
                <div
                  className={`${s.deviceIcon} ${d.status === 'TRUSTED' ? s.deviceIconTrusted : ''}`}
                  aria-hidden
                >
                  {mobile ? <Smartphone size={20} /> : <Monitor size={20} />}
                </div>

                {/* Device Info */}
                <div className={s.deviceInfo}>
                  <div className={s.deviceTop}>
                    <span className={s.deviceName}>{browserName}</span>
                    <span className={`${s.statusBadge} ${statusInfo.cssClass}`}>
                      {d.status === 'TRUSTED' && <CheckCircle2 size={11} aria-hidden />}
                      {d.status === 'REVOKED' && <XCircle size={11} aria-hidden />}
                      {d.status === 'UNVERIFIED' && <AlertCircle size={11} aria-hidden />}
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className={s.deviceMeta}>
                    {d.ip && (
                      <span className={s.metaChip} dir="ltr">
                        <Globe size={11} aria-hidden />
                        {d.ip}
                      </span>
                    )}
                    <span className={s.metaChip}>
                      <CheckCircle2 size={11} aria-hidden />
                      {relTime}
                    </span>
                  </div>

                  {d.userAgent && (
                    <p className={s.deviceUa} title={d.userAgent}>
                      {d.userAgent.slice(0, 90)}
                      {d.userAgent.length > 90 ? '…' : ''}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className={s.deviceActions}>
                  {d.status === 'UNVERIFIED' && (
                    <button
                      type="button"
                      className={s.trustBtn}
                      onClick={() => handleTrust(d.id)}
                      disabled={isPending}
                      aria-label={`دستگاه ${browserName} را معتمد کن`}
                    >
                      <ShieldCheck size={13} aria-hidden />
                      اعتماد
                    </button>
                  )}
                  {d.status !== 'REVOKED' && (
                    <button
                      type="button"
                      className={s.revokeBtn}
                      onClick={() => setRevokeTarget(d.id)}
                      disabled={isPending}
                      aria-label={`دسترسی دستگاه ${browserName} را لغو کن`}
                    >
                      <ShieldOff size={13} aria-hidden />
                      لغو
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Confirm Revoke Dialog ── */}
      <Dialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>لغو دسترسی دستگاه</DialogTitle>
          </DialogHeader>
          <p className={s.dialogText}>
            آیا مطمئن هستید که می‌خواهید دسترسی این دستگاه را لغو کنید؟ این کار قابل بازگشت است ولی
            دستگاه باید دوباره تأیید شود.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={isPending}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeTarget && handleRevoke(revokeTarget)}
              disabled={isPending}
            >
              {isPending ? 'در حال لغو...' : 'لغو دسترسی'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
