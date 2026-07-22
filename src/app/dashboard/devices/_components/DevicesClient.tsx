'use client';

import { revokeDevice, trustDevice, type DeviceRow } from '@/actions/deviceActions';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  Monitor,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import s from './DevicesClient.module.css';

type Props = { devices: DeviceRow[] };

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  UNVERIFIED: { label: 'تأیید نشده', color: 'var(--ds-status-pending-fg)' },
  TRUSTED:    { label: 'معتمد',       color: 'var(--ds-status-success-fg)' },
  REVOKED:    { label: 'لغو شده',    color: 'var(--ds-status-error-fg)' },
};

function isMobile(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /android|iphone|ipad|mobile/i.test(userAgent);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getBrowserName(ua: string | null): string {
  if (!ua) return 'دستگاه ناشناخته';
  if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edge/i.test(ua)) return 'Edge';
  return 'مرورگر ناشناخته';
}

export function DevicesClient({ devices: initial }: Props) {
  const [devices, setDevices] = useState<DeviceRow[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = useCallback((id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await revokeDevice(id);
      if (!res.success) { setError(res.error.message); return; }
      setDevices((prev) => prev.map((d) => d.id === id ? { ...d, status: 'REVOKED' } : d));
    });
  }, []);

  const handleTrust = useCallback((id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await trustDevice(id);
      if (!res.success) { setError(res.error.message); return; }
      setDevices((prev) => prev.map((d) => d.id === id ? { ...d, status: 'VERIFIED' } : d));
    });
  }, []);

  return (
    <div className={s.page}>
      <PageHeader
        title="دستگاه‌های من"
        description="دستگاه‌های متصل به حساب شما را مدیریت کنید"
        eyebrow="امنیت"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'دستگاه‌ها' }]}
      />

      {error && (
        <div className={s.errorBanner} role="alert">
          <AlertCircle size={15} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {devices.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title="هنوز دستگاهی ثبت نشده"
          description="دستگاه‌های متصل به حساب شما اینجا نمایش داده می‌شوند."
        />
      ) : (
        <div className={s.deviceList} role="list">
          {devices.map((d) => {
            const mobile = isMobile(d.userAgent);
            const statusInfo = STATUS_MAP[d.status] ?? STATUS_MAP.UNVERIFIED!;
            const browserName = getBrowserName(d.userAgent);

            return (
              <div key={d.id} className={s.deviceCard} role="listitem">
                <div className={s.deviceIcon} aria-hidden>
                  {mobile ? <Smartphone size={22} /> : <Monitor size={22} />}
                </div>

                <div className={s.deviceInfo}>
                  <div className={s.deviceTop}>
                    <span className={s.deviceName}>{browserName}</span>
                    <span
                      className={s.statusBadge}
                      style={{ color: statusInfo.color }}
                    >
                      {d.status === 'VERIFIED' && <CheckCircle2 size={12} aria-hidden />}
                      {d.status === 'REVOKED'   && <XCircle size={12} aria-hidden />}
                      {d.status === 'UNVERIFIED' && <AlertCircle size={12} aria-hidden />}
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className={s.deviceMeta}>
                    {d.ip && <span dir="ltr">{d.ip}</span>}
                    <span>آخرین فعالیت: {formatDate(d.lastSeenAt)}</span>
                  </div>
                  <p className={s.deviceUa}>{d.userAgent?.slice(0, 80) ?? '—'}</p>
                </div>

                <div className={s.deviceActions}>
                  {d.status !== 'VERIFIED' && d.status !== 'REVOKED' && (
                    <Button
                      size="sm" variant="outline"
                      onClick={() => handleTrust(d.id)}
                      disabled={isPending}
                    >
                      اعتماد
                    </Button>
                  )}
                  {d.status !== 'REVOKED' && (
                    <Button
                      size="sm" variant="destructive"
                      onClick={() => handleRevoke(d.id)}
                      disabled={isPending}
                    >
                      لغو
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
