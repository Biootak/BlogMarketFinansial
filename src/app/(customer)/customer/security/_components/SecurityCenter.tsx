'use client';

/**
 * SecurityCenter — مرکز امنیت حساب مشتری
 * ----------------------------------------------------------------------------
 *   - 1) Security Score: نمایش یکپارچهٔ وضعیت امنیتی
 *   - 2) Password Change: فرم تغییر رمز با Zod validation سمت کلاینت
 *   - 3) 2FA: خلاصه + لینک به /customer/2fa
 *   - 4) Active Sessions: تعداد + لینک به /customer/devices
 *   - 5) Danger Zone: ConfirmDialog با عبارت امنیتی برای حذف حساب
 *
 * 2026-07-29: این صفحه جایگزین redirect به auth flow شد. هر اقدام
 * destructive با ConfirmDialog محافظت می‌شود.
 */

import {
  changeMyPassword,
  requestAccountDeletion,
  type SecurityOverview,
} from '@/actions/customer-portal';
import { SectionHeader } from '@/app/(customer)/customer/_lib/customer-ui';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  Monitor,
  ShieldCheck,
  ShieldX,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import s from './SecurityCenter.module.css';

interface Props {
  overview: SecurityOverview;
}

type PasswordForm = {
  current: string;
  next: string;
  confirm: string;
};

const EMPTY_PASSWORD: PasswordForm = { current: '', next: '', confirm: '' };

function passwordStrength(pwd: string): { score: 0 | 1 | 2 | 3 | 4; label: string; tone: string } {
  if (!pwd) return { score: 0, label: '—', tone: 'neutral' };
  let score = 0;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  // 0..5 → نگاشت به 0..4
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const label = ['خیلی ضعیف', 'ضعیف', 'متوسط', 'خوب', 'عالی'][clamped];
  const tone = ['neutral', 'danger', 'warning', 'brand', 'success'][clamped];
  return { score: clamped, label, tone };
}

export function SecurityCenter({ overview }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  // ── Password form state ────────────────────────────────────────────
  const [pwd, setPwd] = useState<PasswordForm>(EMPTY_PASSWORD);
  const [showPwd, setShowPwd] = useState({ current: false, next: false });
  const [pwdPending, startPwdTransition] = useTransition();

  // ── Delete account state ───────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePending, startDeleteTransition] = useTransition();

  // ── Security score ─────────────────────────────────────────────────
  const score = useMemo(() => {
    let pts = 0;
    const max = 4;
    if (overview.passwordLastChangedAt) pts++;
    if (overview.twoFactorEnabled) pts++;
    if (overview.deviceCount <= 3) pts++;
    if (overview.email) pts++;
    return { value: pts, max, percent: Math.round((pts / max) * 100) };
  }, [overview]);

  const scoreTone = score.value === score.max ? 'success' : score.value >= 2 ? 'warning' : 'danger';

  // ── Handlers ───────────────────────────────────────────────────────

  function handleChangePwd() {
    startPwdTransition(async () => {
      const res = await changeMyPassword(pwd);
      if (res.success) {
        toast({
          title: 'رمز عبور تغییر کرد',
          description: 'از تمام دستگاه‌های دیگر خارج شدید. لطفاً دوباره وارد شوید.',
          variant: 'success',
        });
        setPwd(EMPTY_PASSWORD);
        // سایر sessionها باطل شده‌اند؛ به auth برو
        setTimeout(() => router.push('/auth'), 800);
      } else {
        toast({
          title: 'خطا در تغییر رمز',
          description: res.error.message,
          variant: 'destructive',
        });
      }
    });
  }

  function handleDeleteAccount() {
    startDeleteTransition(async () => {
      const res = await requestAccountDeletion(deleteConfirm);
      if (res.success) {
        toast({
          title: 'درخواست ثبت شد',
          description: `شماره پیگیری: ${res.data.ticketId}. صرافی ظرف ۲۴ ساعت با شما تماس می‌گیرد.`,
          variant: 'success',
        });
        setDeleteOpen(false);
        setDeleteConfirm('');
      } else {
        toast({
          title: 'خطا',
          description: res.error.message,
          variant: 'destructive',
        });
      }
    });
  }

  const strength = passwordStrength(pwd.next);
  const pwdFormInvalid = !pwd.current || !pwd.next || pwd.next !== pwd.confirm || strength.score < 3;

  return (
    <div className={s.root}>
      {/* ═══ 1) Security Score ═══════════════════════════════════════ */}
      <section className={s.scoreSection} data-tone={scoreTone}>
        <div className={s.scoreHeader}>
          <div className={s.scoreIcon} aria-hidden>
            {scoreTone === 'success' ? <ShieldCheck size={20} /> : <ShieldX size={20} />}
          </div>
          <div className={s.scoreMain}>
            <span className={s.scoreEyebrow}>امتیاز امنیتی</span>
            <h2 className={s.scoreTitle}>
              {score.value} از {score.max} مورد فعال
            </h2>
            <p className={s.scoreSub}>
              {scoreTone === 'success'
                ? 'حساب شما در وضعیت مطلوبی قرار دارد.'
                : scoreTone === 'warning'
                  ? 'با فعال‌سازی ۲FA و به‌روزرسانی رمز، امنیت حساب را بالا ببرید.'
                  : 'برای محافظت از حساب، اقدامات زیر را انجام دهید.'}
            </p>
          </div>
          <div className={s.scoreRing} aria-hidden>
            <svg viewBox="0 0 100 100" aria-hidden role="presentation">
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="6" opacity={0.12} />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(score.percent / 100) * 276} 276`}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <span className={s.scoreRingLabel}>{score.percent}٪</span>
          </div>
        </div>
        <ul className={s.scoreChecks}>
          <li data-on={Boolean(overview.passwordLastChangedAt)}>
            <CircleDot size={12} aria-hidden />
            <span>رمز عبور ثبت شده</span>
          </li>
          <li data-on={overview.twoFactorEnabled}>
            <CircleDot size={12} aria-hidden />
            <span>احراز هویت دو مرحله‌ای</span>
          </li>
          <li data-on={overview.deviceCount <= 3}>
            <CircleDot size={12} aria-hidden />
            <span>{overview.deviceCount} دستگاه فعال</span>
          </li>
          <li data-on={Boolean(overview.email)}>
            <CircleDot size={12} aria-hidden />
            <span>ایمیل تأیید شده</span>
          </li>
        </ul>
      </section>

      {/* ═══ 2) Password change ═══════════════════════════════════════ */}
      <section className={s.card}>
        <SectionHeader icon={KeyRound} title="تغییر رمز عبور" sub="رمز قوی با حرف بزرگ، کوچک و عدد" />
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            if (!pwdFormInvalid) handleChangePwd();
          }}
        >
          <Field
            id="current"
            label="رمز فعلی"
            value={pwd.current}
            visible={showPwd.current}
            onToggleVisible={() => setShowPwd((p) => ({ ...p, current: !p.current }))}
            onChange={(v) => setPwd((p) => ({ ...p, current: v }))}
            autoComplete="current-password"
          />
          <Field
            id="next"
            label="رمز جدید"
            value={pwd.next}
            visible={showPwd.next}
            onToggleVisible={() => setShowPwd((p) => ({ ...p, next: !p.next }))}
            onChange={(v) => setPwd((p) => ({ ...p, next: v }))}
            autoComplete="new-password"
            showStrength
            strength={strength}
          />
          <Field
            id="confirm"
            label="تکرار رمز جدید"
            value={pwd.confirm}
            visible={showPwd.next}
            onToggleVisible={() => setShowPwd((p) => ({ ...p, next: !p.next }))}
            onChange={(v) => setPwd((p) => ({ ...p, confirm: v }))}
            autoComplete="new-password"
            invalid={pwd.confirm.length > 0 && pwd.confirm !== pwd.next}
          />
          <div className={s.formActions}>
            <button
              type="submit"
              className={s.primaryBtn}
              disabled={pwdFormInvalid || pwdPending}
              aria-busy={pwdPending || undefined}
            >
              {pwdPending ? (
                <>
                  <Loader2 size={14} className={s.spin} aria-hidden /> در حال ذخیره…
                </>
              ) : (
                <>
                  <Lock size={14} aria-hidden /> تغییر رمز
                </>
              )}
            </button>
            <button
              type="button"
              className={s.ghostBtn}
              onClick={() => setPwd(EMPTY_PASSWORD)}
              disabled={pwdPending}
            >
              پاک کردن
            </button>
          </div>
        </form>
      </section>

      {/* ═══ 3) 2FA + 4) Devices quick links ══════════════════════════ */}
      <div className={s.linkGrid}>
        <Link href="/customer/2fa" className={s.linkCard} data-tone={overview.twoFactorEnabled ? 'success' : 'warning'}>
          <div className={s.linkIcon} aria-hidden>
            <Fingerprint size={20} />
          </div>
          <div className={s.linkMain}>
            <h3 className={s.linkTitle}>احراز هویت دو مرحله‌ای</h3>
            <p className={s.linkSub}>
              {overview.twoFactorEnabled ? 'فعال — محافظت بیشتر' : 'غیرفعال — توصیه می‌شود فعال شود'}
            </p>
          </div>
          {overview.twoFactorEnabled ? (
            <CheckCircle2 size={18} className={s.linkStatus} aria-hidden />
          ) : (
            <AlertTriangle size={18} className={s.linkStatus} aria-hidden />
          )}
        </Link>

        <Link href="/customer/devices" className={s.linkCard} data-tone="brand">
          <div className={s.linkIcon} aria-hidden>
            <Monitor size={20} />
          </div>
          <div className={s.linkMain}>
            <h3 className={s.linkTitle}>دستگاه‌های فعال</h3>
            <p className={s.linkSub}>
              {overview.deviceCount} دستگاه متصل — مدیریت و لغو دسترسی
            </p>
          </div>
        </Link>
      </div>

      {/* ═══ 5) Danger Zone ═══════════════════════════════════════════ */}
      <section className={s.dangerCard}>
        <SectionHeader
          icon={Trash2}
          title="منطقهٔ خطر"
          sub="اقدامات برگشت‌ناپذیر — با دقت انجام شود"
        />
        <div className={s.dangerRow}>
          <div className={s.dangerInfo}>
            <h3 className={s.dangerTitle}>حذف حساب</h3>
            <p className={s.dangerSub}>
              حساب شما برای همیشه غیرفعال می‌شود. پس از تأیید صرافی، تمام داده‌ها، تراکنش‌ها و مدارک شما
              حذف خواهد شد. این عملیات قابل بازگشت نیست.
            </p>
          </div>
          <button
            type="button"
            className={s.dangerBtn}
            onClick={() => setDeleteOpen(true)}
            aria-label="باز کردن گفت‌وگوی حذف حساب"
          >
            <Trash2 size={14} aria-hidden /> درخواست حذف
          </button>
        </div>
      </section>

      {/* ── Confirm Dialog: Delete Account ─────────────────────────── */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setDeleteConfirm('');
        }}
        title="حذف حساب"
        description="این عملیات برگشت‌ناپذیر است. برای تأیید، عبارت «حذف حساب» را در کادر زیر وارد کنید."
        confirmLabel="تأیید و ثبت درخواست"
        cancelLabel="انصراف"
        variant="danger"
        loading={deletePending}
        onConfirm={handleDeleteAccount}
        body={
          <div className={s.confirmBody}>
            <label htmlFor="delete-confirm" className={s.confirmLabel}>
              عبارت تأیید: <code>حذف حساب</code>
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className={s.confirmInput}
              autoComplete="off"
              dir="rtl"
              aria-describedby="delete-hint"
            />
            <p id="delete-hint" className={s.confirmHint}>
              صرافی پس از بررسی، با شما تماس می‌گیرد. لطفاً شماره تماس خود را به‌روز نگه دارید.
            </p>
          </div>
        }
      />
    </div>
  );
}

// ── Field (password input with optional strength) ──────────────────────── //

function Field({
  id,
  label,
  value,
  visible,
  onToggleVisible,
  onChange,
  autoComplete,
  invalid,
  showStrength,
  strength,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (v: string) => void;
  autoComplete: string;
  invalid?: boolean;
  showStrength?: boolean;
  strength?: { score: 0 | 1 | 2 | 3 | 4; label: string; tone: string };
}) {
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.fieldLabel}>
        {label}
      </label>
      <div className={s.fieldWrap} data-invalid={invalid || undefined}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={s.fieldInput}
          autoComplete={autoComplete}
          dir="ltr"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className={s.fieldToggle}
          aria-label={visible ? 'پنهان کردن' : 'نمایش'}
        >
          {visible ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
        </button>
      </div>
      {showStrength && strength && value && (
        <div className={s.strength} data-tone={strength.tone} aria-live="polite">
          <div className={s.strengthBars}>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={s.strengthBar}
                data-on={i < strength.score || undefined}
              />
            ))}
          </div>
          <span className={s.strengthLabel}>{strength.label}</span>
        </div>
      )}
    </div>
  );
}
