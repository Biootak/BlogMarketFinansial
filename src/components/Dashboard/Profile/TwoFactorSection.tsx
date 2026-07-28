'use client';

/**
 * TwoFactorSection — Premium 2FA management panel.
 *
 * Replaces the missing 2FA section that the previous code review flagged.
 * Renders three states (disabled, setup-in-progress, enabled) inside a
 * SettingsSurfaceCard so it slots naturally into the profile screen.
 *
 *   1. Disabled  → "Enable 2FA" CTA.
 *   2. Setup     → QR code (otpauth://) + secret + 6-digit verification.
 *   3. Enabled   → status banner + backup codes + disable dialog.
 *
 * Uses:
 *   - setup2FA / confirmEnable2FA / disable2FA / get2FAStatus from
 *     src/actions/twoFactorActions.ts.
 *   - SettingsSurfaceCard, ConfirmDialog, FormField from primitives.
 *
 * Notes:
 *   - The QR code is rendered as a server-fetchable URL via a public
 *     `qrserver.com` API call; no third-party deps installed. The user
 *     can also enter the secret manually.
 *   - Backup codes are returned ONCE after a successful enable. We
 *     cache them in component state and surface a "copy" / "download .txt"
 *     affordance. They are NEVER persisted in localStorage.
 */

import {
  setup2FA,
  confirmEnable2FA,
  disable2FA,
  get2FAStatus,
  type TwoFASetupData,
  type TwoFAStatus,
} from '@/actions/twoFactorActions';
import { SettingsSurfaceCard } from '@/components/Dashboard/primitives/SettingsSurfaceCard';
import { ConfirmDialog } from '@/components/Dashboard/primitives/ConfirmDialog';
import { FormField } from '@/components/Dashboard/primitives/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  KeyRound,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import s from './TwoFactorSection.module.css';

/* ─── helpers ────────────────────────────────────────────────────────────── */

function buildQrUrl(otpauth: string): string {
  // Public QR generator — no third-party npm install required.
  // The user can scan with Google Authenticator / 1Password / Authy.
  const params = new URLSearchParams({ data: otpauth, size: '240x240', margin: '1' });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

function formatSecret(secret: string): string {
  // Group by 4 chars for readability: ABCD EFGH IJKL MNOP
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

function buildBackupCodesText(codes: string[], userEmail?: string): string {
  const header = [
    'کدهای پشتیبان احراز دو مرحله‌ای',
    userEmail ? `کاربر: ${userEmail}` : null,
    'این کدها را در جای امن نگه دارید. هر کد فقط یک‌بار قابل استفاده است.',
    '',
  ]
    .filter(Boolean)
    .join('\n');
  return `${header}${codes.join('\n')}\n`;
}

/* ─── component ──────────────────────────────────────────────────────────── */

type View = 'loading' | 'disabled' | 'setup' | 'enabled';

interface TwoFactorSectionProps {
  userEmail?: string;
}

export function TwoFactorSection({ userEmail }: TwoFactorSectionProps) {
  const [view, setView] = useState<View>('loading');
  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [setupData, setSetupData] = useState<TwoFASetupData | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  /* ── initial status fetch ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await get2FAStatus();
      if (cancelled) return;
      if (res.success && res.data) {
        setStatus(res.data);
        setView(res.data.enabled ? 'enabled' : 'disabled');
      } else {
        setView('disabled');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── derived ── */
  const qrUrl = useMemo(() => (setupData ? buildQrUrl(setupData.otpauthUri) : ''), [setupData]);
  const isVerifying = verifyCode.length === 6;

  /* ── handlers ── */
  const handleStartSetup = useCallback(async () => {
    setIsBusy(true);
    try {
      const res = await setup2FA();
      if (res.success && res.data) {
        setSetupData(res.data);
        setView('setup');
        setVerifyCode('');
        setBackupCodes(null);
      } else {
        toast({
          title: 'خطا',
          description: !res.success ? (res.error?.message ?? 'شروع فرایند فعال‌سازی با خطا مواجه شد.') : 'خطای ناشناخته',
          variant: 'destructive',
        });
      }
    } finally {
      setIsBusy(false);
    }
  }, []);

  const handleConfirmEnable = useCallback(async () => {
    if (!setupData || !isVerifying) return;
    setIsBusy(true);
    try {
      const res = await confirmEnable2FA(verifyCode);
      if (res.success && res.data) {
        setBackupCodes(res.data.backupCodes);
        setStatus({ enabled: true, hasBackupCodes: true, backupCodesCount: res.data.backupCodes.length });
        setView('enabled');
        toast({
          title: 'احراز دو مرحله‌ای فعال شد',
          description: 'کدهای پشتیبان را در جای امن ذخیره کنید.',
          variant: 'success',
        });
      } else {
        toast({
          title: 'کد نامعتبر',
          description: !res.success ? (res.error?.message ?? 'کد وارد شده معتبر نیست. دوباره تلاش کنید.') : 'خطای ناشناخته',
          variant: 'destructive',
        });
      }
    } finally {
      setIsBusy(false);
    }
  }, [setupData, verifyCode, isVerifying]);

  const handleDisable = useCallback(async () => {
    if (disableCode.length !== 6) {
      toast({
        title: 'کد لازم است',
        description: 'برای غیرفعال‌سازی باید کد فعلی اپلیکیشن احراز را وارد کنید.',
        variant: 'destructive',
      });
      return;
    }
    setIsBusy(true);
    try {
      const res = await disable2FA(disableCode);
      if (res.success) {
        setStatus({ enabled: false, hasBackupCodes: false, backupCodesCount: 0 });
        setView('disabled');
        setIsDisableOpen(false);
        setDisableCode('');
        setSetupData(null);
        setBackupCodes(null);
        toast({
          title: 'احراز دو مرحله‌ای غیرفعال شد',
          description: 'حساب شما فقط با رمز عبور محافظت می‌شود.',
        });
      } else {
        toast({
          title: 'خطا',
          description: !res.success ? (res.error?.message ?? 'کد وارد شده نامعتبر است.') : 'خطای ناشناخته',
          variant: 'destructive',
        });
      }
    } finally {
      setIsBusy(false);
    }
  }, [disableCode]);

  const handleCancelSetup = useCallback(() => {
    setSetupData(null);
    setVerifyCode('');
    setView('disabled');
  }, []);

  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'کپی شد', description: `${label} در کلیپ‌بورد ذخیره شد.` });
    } catch {
      toast({ title: 'خطا', description: 'کپی با خطا مواجه شد.', variant: 'destructive' });
    }
  }, []);

  const handleDownloadCodes = useCallback(() => {
    if (!backupCodes) return;
    const blob = new Blob([buildBackupCodesText(backupCodes, userEmail)], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [backupCodes, userEmail]);

  /* ────────────────────────────────────────────────────────────────────────
     Render
     ──────────────────────────────────────────────────────────────────────── */

  return (
    <>
      <SettingsSurfaceCard
        id="two-factor"
        title="احراز هویت دو مرحله‌ای"
        description="یک لایه امنیتی اضافی برای حساب شما — حتی اگر رمز عبور فاش شود، ورود بدون کد تأیید امکان‌پذیر نیست."
        icon={ShieldCheck}
        tone="info"
        badge={{ label: 'امنیت', tone: 'info' }}
      >
        {view === 'loading' && (
          <div className={s.loadingRow} role="status" aria-live="polite">
            <Loader2 className={s.spinner} size={18} aria-hidden />
            <span>در حال بررسی وضعیت…</span>
          </div>
        )}

        {view === 'disabled' && (
          <div className={s.disabledState}>
            <div className={s.stateRow}>
              <div className={s.stateIcon} data-tone="warn" aria-hidden>
                <ShieldOff size={18} strokeWidth={1.75} />
              </div>
              <div className={s.stateText}>
                <p className={s.stateTitle}>احراز دو مرحله‌ای غیرفعال است</p>
                <p className={s.stateDesc}>
                  حساب شما فقط با رمز عبور محافظت می‌شود. فعال‌سازی احراز دو مرحله‌ای توصیه می‌شود.
                </p>
              </div>
            </div>
            <Button onClick={handleStartSetup} disabled={isBusy} className={s.primaryCta}>
              {isBusy ? <Loader2 className={s.spinner} size={16} aria-hidden /> : <KeyRound size={15} aria-hidden />}
              <span>{isBusy ? 'در حال آماده‌سازی…' : 'فعال‌سازی احراز دو مرحله‌ای'}</span>
            </Button>
          </div>
        )}

        {view === 'setup' && setupData && (
          <div className={s.setupState}>
            <ol className={s.steps}>
              <li className={s.step}>
                <span className={s.stepNum} aria-hidden>
                  ۱
                </span>
                <div className={s.stepBody}>
                  <p className={s.stepTitle}>اپلیکیشن احراز را نصب کنید</p>
                  <p className={s.stepDesc}>
                    Google Authenticator، 1Password، Authy یا هر اپلیکیشن سازگار با TOTP.
                  </p>
                </div>
              </li>
              <li className={s.step}>
                <span className={s.stepNum} aria-hidden>
                  ۲
                </span>
                <div className={s.stepBody}>
                  <p className={s.stepTitle}>QR کد را اسکن کنید</p>
                  <div className={s.qrBlock}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl}
                      alt="QR code برای افزودن حساب به اپلیکیشن احراز"
                      className={s.qr}
                      width={180}
                      height={180}
                    />
                    <div className={s.secretBlock}>
                      <p className={s.secretLabel}>یا کلید زیر را دستی وارد کنید:</p>
                      <div className={s.secretRow}>
                        <code className={s.secret} dir="ltr">
                          {formatSecret(setupData.secret)}
                        </code>
                        <button
                          type="button"
                          className={s.copyBtn}
                          onClick={() => handleCopy(setupData.secret, 'کلید مخفی')}
                          aria-label="کپی کلید مخفی"
                        >
                          <Copy size={13} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              <li className={s.step}>
                <span className={s.stepNum} aria-hidden>
                  ۳
                </span>
                <div className={s.stepBody}>
                  <p className={s.stepTitle}>کد ۶ رقمی را وارد و تأیید کنید</p>
                  <div className={s.verifyRow}>
                    <FormField label="کد تأیید">
                      <Input
                        value={verifyCode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setVerifyCode(digits);
                        }}
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        placeholder="۱۲۳۴۵۶"
                        className="text-center font-mono text-lg tracking-widest"
                        dir="ltr"
                        maxLength={6}
                        aria-label="کد ۶ رقمی اپلیکیشن احراز"
                      />
                    </FormField>
                    <Button
                      onClick={handleConfirmEnable}
                      disabled={!isVerifying || isBusy}
                      className={s.confirmBtn}
                    >
                      {isBusy ? <Loader2 className={s.spinner} size={16} aria-hidden /> : <CheckCircle2 size={15} aria-hidden />}
                      <span>{isBusy ? 'در حال تأیید…' : 'تأیید و فعال‌سازی'}</span>
                    </Button>
                  </div>
                </div>
              </li>
            </ol>

            <div className={s.setupFooter}>
              <button type="button" className={s.cancelLink} onClick={handleCancelSetup}>
                انصراف
              </button>
            </div>
          </div>
        )}

        {view === 'enabled' && (
          <div className={s.enabledState}>
            <div className={s.stateRow}>
              <div className={s.stateIcon} data-tone="success" aria-hidden>
                <ShieldCheck size={18} strokeWidth={1.75} />
              </div>
              <div className={s.stateText}>
                <p className={s.stateTitle}>احراز دو مرحله‌ای فعال است</p>
                <p className={s.stateDesc}>
                  برای ورود، علاوه بر رمز عبور، کد ۶ رقمی اپلیکیشن احراز لازم است.
                </p>
              </div>
            </div>

            {backupCodes && (
              <div className={s.backupBlock} role="region" aria-labelledby="backup-codes-title">
                <div className={s.backupHeader}>
                  <div className={s.backupTitleRow}>
                    <Smartphone size={15} aria-hidden />
                    <h3 id="backup-codes-title" className={s.backupTitle}>
                      کدهای پشتیبان
                    </h3>
                  </div>
                  <p className={s.backupDesc}>
                    اگر به اپلیکیشن احراز دسترسی ندارید، از هر کد فقط یک‌بار می‌توانید استفاده کنید.
                  </p>
                </div>
                <div className={s.codesGrid}>
                  {backupCodes.map((code, i) => (
                    <code key={i} className={s.codeChip} dir="ltr">
                      {code}
                    </code>
                  ))}
                </div>
                <div className={s.backupActions}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(backupCodes.join('\n'), 'کدهای پشتیبان')}
                  >
                    <Copy size={13} aria-hidden />
                    <span>کپی همه</span>
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleDownloadCodes}>
                    <Download size={13} aria-hidden />
                    <span>دانلود فایل .txt</span>
                  </Button>
                </div>
                <div className={s.backupWarning} role="alert">
                  <AlertTriangle size={14} aria-hidden />
                  <span>این کدها فقط اینجا و فقط یک‌بار نمایش داده می‌شوند.</span>
                </div>
              </div>
            )}

            <div className={s.dangerZone}>
              <div className={s.dangerText}>
                <XCircle size={15} aria-hidden />
                <span>غیرفعال‌سازی احراز دو مرحله‌ای</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={s.disableBtn}
                onClick={() => setIsDisableOpen(true)}
              >
                غیرفعال‌سازی
              </Button>
            </div>
          </div>
        )}
      </SettingsSurfaceCard>

      {/* Disable confirmation dialog */}
      <ConfirmDialog
        open={isDisableOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDisableCode('');
          }
          setIsDisableOpen(open);
        }}
        title="غیرفعال‌سازی احراز دو مرحله‌ای"
        description="برای تأیید، کد ۶ رقمی فعلی اپلیکیشن احراز را وارد کنید. این عملیات بلافاصله اعمال می‌شود."
        confirmLabel="تأیید غیرفعال‌سازی"
        cancelLabel="انصراف"
        variant="danger"
        loading={isBusy}
        onConfirm={handleDisable}
        body={
          <div className={s.dialogBody}>
            <FormField label="کد تأیید ۶ رقمی">
              <Input
                value={disableCode}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setDisableCode(digits);
                }}
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder="۱۲۳۴۵۶"
                dir="ltr"
                maxLength={6}
                className="text-center font-mono text-lg tracking-widest"
                aria-label="کد ۶ رقمی برای تأیید غیرفعال‌سازی"
              />
            </FormField>
            <div className={cn(s.dialogWarn)} role="alert">
              <AlertTriangle size={13} aria-hidden />
              <span>
                حساب شما فقط با رمز عبور محافظت خواهد شد. این عملیات قابل بازگشت است.
              </span>
            </div>
          </div>
        }
      />
    </>
  );
}

export default TwoFactorSection;
