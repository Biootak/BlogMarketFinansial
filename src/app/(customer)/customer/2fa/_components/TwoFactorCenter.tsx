'use client';

/**
 * TwoFactorCenter — کنسول ۲FA (TOTP) برای Customer Portal
 *
 * ۳ حالت:
 *   - DISABLED: CTA شروع setup
 *   - SETUP (در جریان): نمایش QR + secret + input کد
 *   - ENABLED: خلاصهٔ وضعیت + backup codes + disable CTA
 *
 * نکته: کدهای backup فقط یک‌بار بعد از setup نمایش داده می‌شوند.
 *       کاربر باید آنها را ذخیره (print/copy) کند.
 */

import {
  type TwoFASetupData,
  confirmEnable2FA,
  disable2FA,
  setup2FA,
} from '@/actions/twoFactorActions';
import { ConfirmDialog, EmptyState, FormField, Spotlight } from '@/components/Dashboard/primitives';
import CellCodeInput, { type CellCodeInputHandle } from '@/components/ui/CellCodeInput';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import s from './TwoFactorCenter.module.css';

type Initial2FA = {
  enabled: boolean;
  hasBackupCodes: boolean;
  verifiedAt: string | null;
  lastUsedAt: string | null;
  channel: 'TOTP' | null;
};

type FlowState = 'IDLE' | 'SETTING_UP' | 'AWAITING_CODE' | 'JUST_ENABLED' | 'ENABLED' | 'DISABLING';

type Props = {
  initial: Initial2FA;
  /** اگر داده شود، بعد از موفقیت به این مسیر ریدایرکت می‌شود (حساب مالک/مدیر). */
  redirectTo?: string;
  /**
   * آیا کاربر اجازهٔ غیرفعال‌سازی دارد؟ (سرور برای OWNER/SUPERADMIN همیشه رد می‌کند؛
   * UI نباید دکمه‌ای نشان دهد که حتماً با خطا مواجه می‌شود.)
   */
  canDisable?: boolean;
};

const formatPersianDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
};

const formatRelativeTime = (iso: string | null): string => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'لحظاتی پیش';
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ساعت پیش`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} روز پیش`;
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
};

export default function TwoFactorCenter({ initial, redirectTo, canDisable = true }: Props) {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowState>(initial.enabled ? 'ENABLED' : 'IDLE');
  const [setup, setSetup] = useState<TwoFASetupData | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const tokenInputRef = useRef<CellCodeInputHandle | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const submittingRef = useRef(false);

  const [meta, setMeta] = useState(initial);

  // QR به‌صورت محلی (بدون سرویس خارجی) ساخته می‌شود — آفلاین و محرمانه کار می‌کند.
  useEffect(() => {
    if (!setup?.otpauthUri) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(setup.otpauthUri, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [setup?.otpauthUri]);

  // پس از JUST_ENABLED → اگر redirectTo داده شده، شمارش معکوس و ریدایرکت؛
  // در غیر این صورت (پورتال مشتری) بعد از ۱۲ ثانیه → حالت ENABLED.
  useEffect(() => {
    if (flow !== 'JUST_ENABLED' || !redirectTo) return;
    if (countdown <= 0) {
      router.replace(redirectTo);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [flow, countdown, redirectTo, router]);

  useEffect(() => {
    if (flow !== 'JUST_ENABLED' || redirectTo) return;
    const t = setTimeout(() => setFlow('ENABLED'), 12_000);
    return () => clearTimeout(t);
  }, [flow, redirectTo]);

  // SECURITY-fix (2026-08-22): فعال‌سازی 2FA رمز عبور فعلی می‌خواهد
  const [confirmSetupPassword, setConfirmSetupPassword] = useState(false);
  const [setupPasswordInput, setSetupPasswordInput] = useState('');

  const startSetup = useCallback((password?: string) => {
    setError(null);
    setBackupCodes(null);
    if (!password) {
      setSetupPasswordInput('');
      setConfirmSetupPassword(true);
      return;
    }
    startTransition(async () => {
      const r = await setup2FA(password);
      if (!r.success) {
        setError(r.error?.message ?? 'خطا در شروع فرایند');
        return;
      }
      setSetup(r.data);
      setFlow('AWAITING_CODE');
      setConfirmSetupPassword(false);
      setTimeout(() => tokenInputRef.current?.focus(), 80);
    });
  }, []);

  const confirm = useCallback(
    (code?: string) => {
      const value = (code ?? token).trim();
      if (!/^\d{6}$/.test(value)) {
        setError('کد باید ۶ رقم باشد');
        return;
      }
      if (submittingRef.current) return;
      submittingRef.current = true;
      setError(null);
      startTransition(async () => {
        try {
          const r = await confirmEnable2FA(value);
          if (!r.success) {
            setError(r.error?.message ?? 'کد نامعتبر');
            return;
          }
          setBackupCodes(r.data?.backupCodes ?? []);
          setMeta({
            enabled: true,
            hasBackupCodes: true,
            verifiedAt: new Date().toISOString(),
            lastUsedAt: null,
            channel: 'TOTP',
          });
          setFlow('JUST_ENABLED');
          setSetup(null);
          setToken('');
          if (redirectTo) setCountdown(10);
        } finally {
          submittingRef.current = false;
        }
      });
    },
    [token, redirectTo],
  );

  const requestDisable = useCallback(() => {
    setError(null);
    setToken('');
    setConfirmDisable(true);
  }, []);

  const performDisable = useCallback(() => {
    if (!/^\d{6}$/.test(token)) {
      setError('کد تأیید ۶ رقم را وارد کنید');
      return;
    }
    startTransition(async () => {
      const r = await disable2FA(token);
      if (!r.success) {
        setError(r.error?.message ?? 'کد نامعتبر');
        return;
      }
      setMeta({
        enabled: false,
        hasBackupCodes: false,
        verifiedAt: null,
        lastUsedAt: null,
        channel: null,
      });
      setFlow('IDLE');
      setToken('');
      setConfirmDisable(false);
    });
  }, [token]);

  const copyBackupCodes = useCallback(() => {
    if (!backupCodes) return;
    const text = backupCodes.join('\n');
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [backupCodes]);

  const downloadBackupCodes = useCallback(() => {
    if (!backupCodes) return;
    const blob = new Blob(
      [`Two-Factor Backup Codes\n${'='.repeat(28)}\n${backupCodes.join('\n')}\n`],
      {
        type: 'text/plain;charset=utf-8',
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [backupCodes]);

  /* ─── Render ─────────────────────────────────────────────────────── */

  return (
    <div className={s.root} dir="rtl">
      <Spotlight tone="emerald" className={s.spotlight} />

      {/* ── Error (visible in every flow state — including IDLE) ────── */}
      {error && (
        <div className={s.errorBox} role="alert">
          <AlertTriangle size={12} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* ── Hero Status ─────────────────────────────────────────────── */}
      <header className={s.hero} data-enabled={meta.enabled ? 'yes' : 'no'}>
        <div className={s.heroLeft}>
          <span className={s.heroIcon} aria-hidden>
            {meta.enabled ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}
          </span>
          <div>
            <h2 className={s.heroTitle}>
              {meta.enabled ? '۲ مرحله‌ای فعال است' : '۲ مرحله‌ای غیرفعال است'}
            </h2>
            <p className={s.heroSub}>
              {meta.enabled
                ? 'حساب شما با یک لایهٔ اضافی محافظت می‌شود'
                : 'برای محافظت بیشتر، احراز هویت دو مرحله‌ای را فعال کنید'}
            </p>
          </div>
        </div>
        <div className={s.heroMeta}>
          {meta.enabled ? (
            <Badge variant="default">فعال</Badge>
          ) : (
            <Badge variant="secondary">غیرفعال</Badge>
          )}
        </div>
      </header>

      {/* ── Active States ────────────────────────────────────────────── */}
      {flow === 'IDLE' && (
        <section className={s.card}>
          <h3 className={s.cardTitle}>شروع فعال‌سازی</h3>
          <p className={s.cardLead}>
            با فعال‌سازی، هر بار ورود علاوه بر رمز عبور، یک کد ۶ رقمی از اپلیکیشن
            <strong> Authenticator </strong>
            لازم خواهد بود (Google Authenticator، 1Password، Bitwarden، و…).
          </p>
          <ul className={s.benefits}>
            <li>
              <Lock size={12} aria-hidden />
              حتی اگر رمز شما لو برود، ورود ممکن نیست
            </li>
            <li>
              <KeyRound size={12} aria-hidden />
              <span>۱۰ کد پشتیبان یک‌بارمصرف برای مواقع اضطراری</span>
            </li>
            <li>
              <Sparkles size={12} aria-hidden />
              استاندارد صنعتی TOTP (RFC 6238) — بدون نیاز به SMS
            </li>
          </ul>
          <button
            type="button"
            className={s.primaryCta}
            onClick={() => startSetup()}
            disabled={pending}
          >
            {pending ? (
              <Loader2 size={14} className={s.spin} />
            ) : (
              <Sparkles size={14} aria-hidden />
            )}
            شروع فعال‌سازی
          </button>
        </section>
      )}

      {flow === 'AWAITING_CODE' && setup && (
        <section className={s.setupGrid}>
          <article className={s.qrCard}>
            <header className={s.cardHeader}>
              <QrCode size={16} aria-hidden />
              <h3 className={s.cardTitle}>اسکن QR</h3>
            </header>
            <div className={s.qrWrap} aria-label="QR code برای authenticator">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="QR Code برای فعال‌سازی 2FA"
                  width={220}
                  height={220}
                  className={s.qrImg}
                />
              ) : (
                <div className={s.qrPlaceholder} role="status">
                  <Loader2 size={18} className={s.spin} aria-hidden />
                  در حال ساخت QR…
                </div>
              )}
            </div>
            <p className={s.qrHint}>با دوربین یا authenticator اسکن کنید</p>
            <details className={s.secretDetails}>
              <summary>نمی‌توانم اسکن کنم؟ کلید را دستی وارد کنید</summary>
              <code className={s.secretCode} dir="ltr">
                {setup.secret}
              </code>
            </details>
          </article>

          <article className={s.verifyCard}>
            <header className={s.cardHeader}>
              <Smartphone size={16} aria-hidden />
              <h3 className={s.cardTitle}>تأیید کد</h3>
            </header>
            <p className={s.cardLead}>کد ۶ رقمی نمایش‌داده‌شده در اپلیکیشن را وارد کنید.</p>
            <FormField label="کد ۶ رقمی" htmlFor="totp-token">
              <CellCodeInput
                ref={tokenInputRef}
                id="totp-token"
                value={token}
                onChange={(v) => {
                  setToken(v);
                  setError(null);
                }}
                onComplete={(code) => confirm(code)}
                disabled={pending}
                invalid={!!error}
                autoComplete="one-time-code"
                ariaLabel="کد ۶ رقمی"
                className={s.tokenCells}
                cellClassName={s.tokenCell}
                filledClassName={s.tokenCellFilled}
                invalidClassName={s.tokenCellInvalid}
              />
            </FormField>
            <div className={s.verifyActions}>
              <button
                type="button"
                className={s.primaryCta}
                onClick={() => confirm()}
                disabled={pending || token.length !== 6}
              >
                {pending ? (
                  <Loader2 size={14} className={s.spin} />
                ) : (
                  <CheckCircle2 size={14} aria-hidden />
                )}
                تأیید و فعال‌سازی
              </button>
              <button
                type="button"
                className={s.ghostCta}
                onClick={() => {
                  setFlow('IDLE');
                  setSetup(null);
                  setToken('');
                  setError(null);
                }}
                disabled={pending}
              >
                انصراف
              </button>
            </div>
          </article>
        </section>
      )}

      {flow === 'JUST_ENABLED' && backupCodes && (
        <section className={s.backupCard}>
          <header className={s.backupHead}>
            <span className={s.backupIcon} aria-hidden>
              <KeyRound size={18} />
            </span>
            <div>
              <h3 className={s.cardTitle}>۲FA فعال شد — کدهای پشتیبان</h3>
              <p className={s.cardLead}>
                این ۱۰ کد فقط <strong>یک‌بار</strong> نمایش داده می‌شوند. فوراً در جای امن ذخیره کنید.
              </p>
            </div>
          </header>
          <ul className={s.codesGrid} aria-label="کدهای پشتیبان">
            {backupCodes.map((c) => (
              <li key={c} className={s.codeItem} dir="ltr">
                {c}
              </li>
            ))}
          </ul>
          <div className={s.backupActions}>
            <button type="button" className={s.primaryCta} onClick={downloadBackupCodes}>
              <Download size={14} aria-hidden />
              دانلود فایل
            </button>
            <button type="button" className={s.ghostCta} onClick={copyBackupCodes}>
              {copied ? <CheckCircle2 size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              {copied ? 'کپی شد' : 'کپی همه'}
            </button>
          </div>
          {redirectTo && (
            <div className={s.redirectRow}>
              <button
                type="button"
                className={s.primaryCta}
                onClick={() => router.replace(redirectTo)}
              >
                <ChevronLeft size={14} aria-hidden />
                ادامه به داشبورد
              </button>
              <span className={s.redirectHint} role="status">
                انتقال خودکار تا {countdown} ثانیه دیگر
              </span>
            </div>
          )}
        </section>
      )}

      {flow === 'ENABLED' && (
        <section className={s.enabledGrid}>
          <article className={s.metaCard}>
            <h3 className={s.cardTitle}>جزئیات امنیتی</h3>
            <dl className={s.metaList}>
              <div className={s.metaRow}>
                <dt>کانال</dt>
                <dd>
                  <Badge variant="outline">TOTP</Badge>
                </dd>
              </div>
              <div className={s.metaRow}>
                <dt>فعال‌سازی</dt>
                <dd dir="ltr">{formatPersianDateTime(meta.verifiedAt)}</dd>
              </div>
              <div className={s.metaRow}>
                <dt>آخرین استفاده</dt>
                <dd>{formatRelativeTime(meta.lastUsedAt)}</dd>
              </div>
              <div className={s.metaRow}>
                <dt>کدهای پشتیبان</dt>
                <dd>
                  {meta.hasBackupCodes ? (
                    <Badge variant="default">موجود</Badge>
                  ) : (
                    <Badge variant="secondary">تولید نشده</Badge>
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className={s.dangerCard}>
            <header className={s.dangerHead}>
              <ShieldOff size={16} aria-hidden />
              <h3 className={s.cardTitle}>غیرفعال‌سازی</h3>
            </header>
            <p className={s.cardLead}>
              با غیرفعال‌سازی، هر بار ورود فقط با رمز عبور انجام می‌شود. این عمل
              <strong> قابل بازگشت </strong>
              است اما برای تأیید به کد فعلی ۲FA نیاز دارید.
            </p>
            {canDisable ? (
              <button
                type="button"
                className={s.dangerCta}
                onClick={requestDisable}
                disabled={pending}
              >
                <ShieldOff size={14} aria-hidden />
                غیرفعال‌سازی ۲FA
              </button>
            ) : (
              <p className={s.noDisableNote} role="note">
                <ShieldCheck size={14} aria-hidden />
                حساب مالک اجازهٔ غیرفعال‌کردن احراز هویت دو مرحله‌ای را ندارد — امنیت دائمی.
              </p>
            )}
          </article>
        </section>
      )}

      {/* ── Confirm Disable Dialog ───────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDisable}
        onOpenChange={setConfirmDisable}
        title="غیرفعال‌سازی ۲FA"
        description="برای تأیید، کد ۶ رقمی فعلی authenticator را وارد کنید."
        confirmLabel="غیرفعال‌سازی"
        cancelLabel="انصراف"
        variant="danger"
        loading={pending}
        onConfirm={performDisable}
        body={
          <FormField label="کد تأیید" htmlFor="disable-token">
            <CellCodeInput
              id="disable-token"
              value={token}
              onChange={(v) => {
                setToken(v);
                setError(null);
              }}
              disabled={pending}
              invalid={!!error}
              autoComplete="one-time-code"
              ariaLabel="کد تأیید"
              className={s.tokenCells}
              cellClassName={s.tokenCell}
              filledClassName={s.tokenCellFilled}
              invalidClassName={s.tokenCellInvalid}
            />
          </FormField>
        }
      />

      {/* ── Confirm Setup Password Dialog (SECURITY-fix 2026-08-22) ──── */}
      <ConfirmDialog
        open={confirmSetupPassword}
        onOpenChange={(open) => {
          setConfirmSetupPassword(open);
          if (!open) setError(null);
        }}
        title="فعال‌سازی احراز دو مرحله‌ای"
        description="برای اطمینان از هویت شما، ابتدا رمز عبور فعلی حساب را وارد کنید."
        confirmLabel="ادامه و نمایش QR"
        cancelLabel="انصراف"
        loading={pending}
        onConfirm={() => startSetup(setupPasswordInput)}
        body={
          <FormField label="رمز عبور فعلی" htmlFor="setup-password">
            <Input
              id="setup-password"
              type="password"
              value={setupPasswordInput}
              onChange={(e) => {
                setSetupPasswordInput(e.target.value);
                setError(null);
              }}
              autoComplete="current-password"
              placeholder="••••••••"
              dir="ltr"
              disabled={pending}
            />
          </FormField>
        }
      />

      {/* ── Empty state placeholder (used in very rare flow) ────────── */}
      {flow === 'DISABLING' && (
        <EmptyState icon={Loader2} title="در حال پردازش" description="لطفاً صبر کنید…" />
      )}

      {/* ── Footer Hint ─────────────────────────────────────────────── */}
      <footer className={s.foot}>
        <ShieldCheck size={11} aria-hidden />
        <span>
          استاندارد <strong>RFC 6238 (TOTP)</strong> · هر ۳۰ ثانیه کد جدید · سازگار با همهٔ
          اپلیکیشن‌های استاندارد.
        </span>
        <ChevronLeft size={11} aria-hidden />
      </footer>
    </div>
  );
}
