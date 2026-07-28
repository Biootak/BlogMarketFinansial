'use client';

/**
 * DevicesCenter — مدیریت دستگاه‌های متصل به حساب کاربر
 *
 * قابلیت‌ها:
 *   - لیست دستگاه‌ها با وضعیت (TRUSTED / UNVERIFIED / REVOKED)
 *   - لغو دسترسی یک دستگاه (revokeDevice)
 *   - علامت‌گذاری به‌عنوان مورد اعتماد (trustDevice)
 *   - لغو همه دستگاه‌های دیگر (revokeAllOtherDevices)
 *
 * نکته: بدون fingerprint جاری — چون Customer Portal server component است
 * و fingerprint کلاینت‌ساید است. بنابراین "دستگاه جاری" شناسایی نمی‌شود.
 */

import {
  type DeviceRow,
  revokeAllOtherDevices,
  revokeDevice,
  trustDevice,
} from '@/actions/deviceActions';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { useState, useTransition } from 'react';
import s from './DevicesCenter.module.css';

// ── helpers ──────────────────────────────────────────────────────────── //

function parseUA(ua: string | null): { name: string; platform: string } {
  if (!ua) return { name: 'دستگاه ناشناس', platform: 'unknown' };

  const lower = ua.toLowerCase();
  let platform = 'desktop';
  if (/android|mobile/i.test(lower)) platform = 'mobile';
  else if (/ipad|tablet/i.test(lower)) platform = 'tablet';

  // Browser detection
  let browser = 'مرورگر ناشناس';
  if (/chrome|chromium/i.test(lower) && !/edge/i.test(lower)) browser = 'Chrome';
  else if (/firefox/i.test(lower)) browser = 'Firefox';
  else if (/safari/i.test(lower) && !/chrome/i.test(lower)) browser = 'Safari';
  else if (/edg/i.test(lower)) browser = 'Edge';

  // OS detection
  let os = '';
  if (/windows nt/i.test(lower)) os = 'Windows';
  else if (/mac os x|macos/i.test(lower)) os = 'macOS';
  else if (/android/i.test(lower)) os = 'Android';
  else if (/iphone|ipad/i.test(lower)) os = 'iOS';
  else if (/linux/i.test(lower)) os = 'Linux';

  return { name: os ? `${browser} / ${os}` : browser, platform };
}

function DeviceIcon({ platform }: { platform: string }) {
  if (platform === 'mobile') return <Smartphone size={20} aria-hidden />;
  if (platform === 'tablet') return <Tablet size={20} aria-hidden />;
  return <Monitor size={20} aria-hidden />;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

const STATUS_LABEL: Record<string, string> = {
  TRUSTED: 'مورد اعتماد',
  UNVERIFIED: 'تأیید نشده',
  REVOKED: 'لغو شده',
};

// ── Component ─────────────────────────────────────────────────────────── //

interface Props {
  initial: DeviceRow[];
}

export function DevicesCenter({ initial }: Props) {
  const [devices, setDevices] = useState<DeviceRow[]>(initial);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokeAllBusy, setRevokeAllBusy] = useState(false);

  function handleRevoke(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await revokeDevice(id);
      if (res.success) {
        setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'REVOKED' } : d)));
      }
      setBusyId(null);
    });
  }

  function handleTrust(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await trustDevice(id);
      if (res.success) {
        setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'TRUSTED' } : d)));
      }
      setBusyId(null);
    });
  }

  function handleRevokeAll() {
    setRevokeAllBusy(true);
    startTransition(async () => {
      // بدون fingerprint جاری — همه فعال‌ها را لغو می‌کنیم
      const res = await revokeAllOtherDevices('__none__');
      if (res.success) {
        setDevices((prev) =>
          prev.map((d) => (d.status !== 'REVOKED' ? { ...d, status: 'REVOKED' } : d)),
        );
      }
      setRevokeAllBusy(false);
    });
  }

  const activeCount = devices.filter((d) => d.status !== 'REVOKED').length;

  return (
    <div className={s.root} dir="rtl">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className={s.toolbar}>
        <div className={s.toolbarLeft}>
          <span className={s.count}>{activeCount} دستگاه فعال</span>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            className={s.revokeAll}
            disabled={revokeAllBusy || pending}
            onClick={handleRevokeAll}
            aria-label="لغو دسترسی همه دستگاه‌ها"
          >
            {revokeAllBusy ? 'در حال لغو…' : 'لغو همه دستگاه‌ها'}
          </button>
        )}
      </div>

      {/* ── Grid ────────────────────────────────────────────────────── */}
      <div className={s.grid}>
        {devices.length === 0 ? (
          <div className={s.empty}>
            <Monitor size={32} aria-hidden />
            <span>هیچ دستگاهی یافت نشد</span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              دستگاه‌ها هنگام ورود به سیستم ثبت می‌شوند
            </span>
          </div>
        ) : (
          devices.map((device, idx) => {
            const { name, platform } = parseUA(device.userAgent);
            const isRevoked = device.status === 'REVOKED';
            const isBusy = busyId === device.id;
            return (
              <article
                key={device.id}
                className={s.card}
                style={{ '--card-idx': idx } as React.CSSProperties}
                aria-label={`دستگاه: ${name}`}
              >
                <div className={s.cardHead}>
                  <div className={s.deviceIcon}>
                    <DeviceIcon platform={platform} />
                  </div>
                  <div className={s.cardMeta}>
                    <p className={s.deviceName}>{name}</p>
                    <p className={s.deviceSub}>{device.ip ?? 'IP ناشناس'}</p>
                  </div>
                  <output
                    className={s.badge}
                    data-status={device.status}
                    aria-label={`وضعیت: ${STATUS_LABEL[device.status] ?? device.status}`}
                  >
                    {STATUS_LABEL[device.status] ?? device.status}
                  </output>
                </div>

                <div className={s.cardInfo}>
                  <div className={s.infoItem}>
                    <span className={s.infoLabel}>آخرین فعالیت</span>
                    <span className={s.infoValue}>{fmtDate(device.lastSeenAt)}</span>
                  </div>
                  <div className={s.infoItem}>
                    <span className={s.infoLabel}>ثبت در</span>
                    <span className={s.infoValue}>{fmtDate(device.createdAt)}</span>
                  </div>
                </div>

                {!isRevoked && (
                  <div className={s.cardActions}>
                    {device.status !== 'TRUSTED' && (
                      <button
                        type="button"
                        className={s.actionBtn}
                        disabled={isBusy}
                        onClick={() => handleTrust(device.id)}
                        aria-label={`اعتمادسازی دستگاه ${name}`}
                      >
                        {isBusy ? '…' : 'مورد اعتماد'}
                      </button>
                    )}
                    <button
                      type="button"
                      className={s.actionBtn}
                      data-danger="true"
                      disabled={isBusy}
                      onClick={() => handleRevoke(device.id)}
                      aria-label={`لغو دسترسی دستگاه ${name}`}
                    >
                      {isBusy ? 'در حال لغو…' : 'لغو دسترسی'}
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
