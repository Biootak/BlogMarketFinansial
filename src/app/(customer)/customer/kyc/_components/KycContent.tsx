'use client';

/**
 * KycContent — «گیت اعتماد» (Trust Gate)
 * ----------------------------------------------------------------------------
 * معماری tiered KYC استاندارد (FATF / صرافی‌های ارز دیجیتال) — جریان سکوئنشی:
 *   LEVEL_1 — تأیید موبایل و تلگرام (کد OTP تلگرام)
 *   LEVEL_2 — مدرک هویتی + سلفی تأیید چهره
 *   LEVEL_3 — سند آدرس + صورت حساب بانکی (بالاترین سقف)
 *
 * هر سطح فقط بعد از تأیید کامل سطح قبلی باز می‌شود؛ فرم هر سطح در یک
 * دیالوگ (مودال) باز می‌شود تا مسیر ساده و متمرکز بماند.
 */

import { submitKycDocument, submitKycPhone } from '@/actions/customer-portal';
import type { CustomerKycRecord, CustomerProfile } from '@/actions/customer-portal';
import { getTelegramLink, requestPhoneOtpOrTelegramLink } from '@/actions/telegram-otp';
import {
  DOC_TYPE_LABEL,
  KYC_LEVEL_LABEL,
  KYC_STATUS_CSSKEY,
  STATUS_LABEL,
  faDate,
  faDateTime,
  faNum,
} from '@/app/(customer)/customer/_lib/customer-formatters';
import {
  EmptyHint,
  KycStatusIcon,
  LiveDot,
  SectionHeader,
  StatusPill,
  StatusRail,
} from '@/app/(customer)/customer/_lib/customer-ui';
import { ImageUploader } from '@/components/ImageUpload/ImageUploader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KYC_TIER_LIMITS } from '@/lib/kyc-tier';
import { DEFAULT_DIAL_CODE, PHONE_COUNTRIES, combineDialAndNumber } from '@/lib/phone-countries';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  FileText,
  IdCard,
  Landmark,
  Loader2,
  Lock,
  MessageCircle,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import s from './KycContent.module.css';

interface Props {
  profile: CustomerProfile;
  records: CustomerKycRecord[];
}

const DOC_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'NATIONAL_ID', label: 'تذکره / کارت ملی' },
  { value: 'PASSPORT', label: 'پاسپورت' },
  { value: 'RESIDENCE_PERMIT', label: 'اجازه اقامت' },
];

type KycLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

const faNumLimit = new Intl.NumberFormat('fa-IR');
function dailyLimitAf(level: KycLevel): string {
  return `${faNumLimit.format(KYC_TIER_LIMITS[level].dailyAf)} AFN روزانه`;
}

const LEVEL_OPTIONS: Array<{ value: KycLevel; title: string; desc: string }> = [
  {
    value: 'LEVEL_1',
    title: 'سطح ۱ — موبایل و تلگرام',
    desc: 'تأیید شماره موبایل با کد تلگرام — سریع‌ترین شروع',
  },
  {
    value: 'LEVEL_2',
    title: 'سطح ۲ — مدرک و سلفی',
    desc: 'مدرک هویتی + سلفی تأیید چهره',
  },
  {
    value: 'LEVEL_3',
    title: 'سطح ۳ — آدرس و صورتحساب',
    desc: 'سند آدرس + صورت حساب بانکی — بالاترین سقف',
  },
];

export default function KycContent({ profile, records }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successLevel, setSuccessLevel] = useState<KycLevel | null>(null);

  // سطح ۱ — موبایل و تلگرام
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [dialCode, setDialCode] = useState(DEFAULT_DIAL_CODE);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpPending, setOtpPending] = useState(false);

  // سطح ۲ — مدرک هویتی
  const [docType, setDocType] = useState<string>('NATIONAL_ID');
  const [docNumber, setDocNumber] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const handleImageUpload = useCallback((urls: string[]) => setFileUrl(urls[0] ?? ''), []);
  const handleImageRemove = useCallback(() => setFileUrl(''), []);

  // سطح ۲ — سلفی
  const [selfieUrl, setSelfieUrl] = useState('');
  const handleSelfieUpload = useCallback((urls: string[]) => setSelfieUrl(urls[0] ?? ''), []);
  const handleSelfieRemove = useCallback(() => setSelfieUrl(''), []);

  // سطح ۳ — آدرس و صورت حساب بانکی
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [addressDocUrl, setAddressDocUrl] = useState('');
  const handleAddressDocUpload = useCallback(
    (urls: string[]) => setAddressDocUrl(urls[0] ?? ''),
    [],
  );
  const handleAddressDocRemove = useCallback(() => setAddressDocUrl(''), []);
  const [bankStatementUrl, setBankStatementUrl] = useState('');
  const handleBankStatementUpload = useCallback(
    (urls: string[]) => setBankStatementUrl(urls[0] ?? ''),
    [],
  );
  const handleBankStatementRemove = useCallback(() => setBankStatementUrl(''), []);

  // ── جریان سکوئنشی ────────────────────────────────────────────────────
  // سطح هدف = اولین سطحی که هنوز کامل (APPROVED) نشده است.
  const currentNum =
    profile.kycLevel === 'NONE' ? 0 : Number(profile.kycLevel.replace('LEVEL_', ''));
  const targetLevel: KycLevel | null =
    currentNum >= 3 ? null : (['LEVEL_1', 'LEVEL_2', 'LEVEL_3'][currentNum] as KycLevel);

  // سطح هدف در صف بررسی است؟ (بعد از تأیید، فرم آن سطح بسته می‌شود)
  const hasPendingTarget = targetLevel
    ? records.some((r) => r.level === targetLevel && r.status === 'PENDING')
    : false;

  // پورتال باز است؟ (FROZEN/CLOSED اجازه ارسال ندارند)
  const canOpenPortal = profile.status === 'PROSPECT' || profile.status === 'ACTIVE';

  const kycKey = KYC_STATUS_CSSKEY[profile.kycStatus] ?? 'warning';

  const targetOption = targetLevel
    ? (LEVEL_OPTIONS.find((l) => l.value === targetLevel) ?? LEVEL_OPTIONS[0])
    : null;

  /** شماره کامل E.164 — کد کشور + شمارهٔ واردشده (از ماژول مشترک) */
  function getFullPhone(): string {
    return combineDialAndNumber(dialCode, phone);
  }

  function resetFields() {
    setPhone(profile.phone ?? '');
    setDialCode(DEFAULT_DIAL_CODE);
    setOtpCode('');
    setOtpSent(false);
    setOtpInfo(null);
    setTelegramUrl(null);
    setDevCode(null);
    setDocNumber('');
    setFileUrl('');
    setSelfieUrl('');
    setCity('');
    setAddress('');
    setAddressDocUrl('');
    setBankStatementUrl('');
  }

  // ── پولینگ تأیید خودکار تلگرام ─────────────────────────────────────
  // بعد از «ارسال کد»، هر ۳ ثانیه چک می‌شود که آیا وبهوک تلگرام شماره را
  // تأیید کرده (pendingPhone پاک شده) — اگر بله، دیالوگ خودکار بسته می‌شود
  // و کاربر مجبور به وارد کردن OTP نیست.
  const verifyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopVerifyPoll = useCallback(() => {
    if (verifyPollRef.current) {
      clearInterval(verifyPollRef.current);
      verifyPollRef.current = null;
    }
  }, []);

  const startVerifyPoll = useCallback(() => {
    stopVerifyPoll();
    let attempts = 0;
    verifyPollRef.current = setInterval(async () => {
      attempts += 1;
      if (attempts > 40) {
        // ~۲ دقیقه — اگر تلگرام تأیید نکرد، کاربر همچنان مسیر OTP را دارد
        stopVerifyPoll();
        return;
      }
      try {
        const res = await getTelegramLink();
        if (res.success && res.data.linked && res.data.pendingPhoneVerified) {
          stopVerifyPoll();
          setSuccess(true);
          setSuccessLevel('LEVEL_1');
          closeDialog();
          resetFields();
          router.refresh();
        }
      } catch {
        // خطاهای موقتی نادیده گرفته می‌شوند — پولینگ ادامه می‌دهد
      }
    }, 3000);
  }, [stopVerifyPoll, router]);

  useEffect(() => () => stopVerifyPoll(), [stopVerifyPoll]);

  function closeDialog() {
    setDialogOpen(false);
    setError(null);
  }

  // ── سطح ۱: ارسال کد تلگرام ─────────────────────────────────────────
  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOtpInfo(null);
    const full = getFullPhone();
    if (!full) {
      setError('شماره موبایل را وارد کنید');
      return;
    }
    setOtpPending(true);
    startTransition(async () => {
      const res = await requestPhoneOtpOrTelegramLink(full);
      if (res.kind === 'sent') {
        setOtpSent(true);
        setOtpInfo(res.message);
        setDevCode(res.devCode ?? null);
        setTelegramUrl(res.telegramUrl ?? null);
        // اگر شماره با تلگرام یکی باشد، خودکار تأیید می‌شود — پولینگ دیالوگ را می‌بندد
        startVerifyPoll();
      } else {
        setError(res.message);
      }
      setOtpPending(false);
    });
  }

  // ── سطح ۱: تأیید کد و ثبت ──────────────────────────────────────────
  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    stopVerifyPoll();
    if (!otpCode.trim()) {
      setError('کد تأیید را وارد کنید');
      return;
    }
    startTransition(async () => {
      const result = await submitKycPhone({ phone: getFullPhone(), code: otpCode.trim() });
      if (!result.success) {
        setError(result.error ?? 'خطایی رخ داده است');
      } else {
        setSuccess(true);
        setSuccessLevel('LEVEL_1');
        closeDialog();
        resetFields();
        router.refresh();
      }
    });
  }

  // ── سطح ۲ / ۳: ارسال مدرک ──────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!docNumber.trim()) {
      setError('شماره مدرک الزامی است');
      return;
    }
    if (!fileUrl.trim()) {
      setError('تصویر مدرک را آپلود کنید');
      return;
    }
    if (!selfieUrl.trim()) {
      setError('برای این سطح، سلفی (تأیید چهره) الزامی است');
      return;
    }
    if (targetLevel === 'LEVEL_3') {
      if (!city.trim()) {
        setError('برای سطح ۳، شهر الزامی است');
        return;
      }
      if (!address.trim()) {
        setError('برای سطح ۳، آدرس الزامی است');
        return;
      }
      if (!addressDocUrl.trim()) {
        setError('برای سطح ۳، تصویر سند اثبات آدرس الزامی است');
        return;
      }
      if (!bankStatementUrl.trim()) {
        setError('برای سطح ۳، تصویر صورت حساب بانکی الزامی است');
        return;
      }
    }

    startTransition(async () => {
      const result = await submitKycDocument({
        level: targetLevel as KycLevel,
        docType,
        docNumber: docNumber.trim(),
        fileUrl: fileUrl.trim(),
        selfieUrl: selfieUrl.trim(),
        city: targetLevel === 'LEVEL_3' ? city.trim() : undefined,
        address: targetLevel === 'LEVEL_3' ? address.trim() : undefined,
        addressDocUrl: targetLevel === 'LEVEL_3' ? addressDocUrl.trim() : undefined,
        bankStatementUrl: targetLevel === 'LEVEL_3' ? bankStatementUrl.trim() : undefined,
      });
      if (!result.success) {
        setError(result.error ?? 'خطایی رخ داده است');
      } else {
        setSuccess(true);
        setSuccessLevel(targetLevel);
        closeDialog();
        resetFields();
        router.refresh();
      }
    });
  }

  return (
    <div className={s.root} dir="rtl">
      {/* ── Trust Hero ──────────────────────────────────────────────── */}
      <section className={s.hero} data-tone={kycKey} aria-label="وضعیت احراز هویت">
        <StatusRail variant={kycKey} />
        <div className={s.heroInner}>
          <div className={s.heroTop}>
            <div className={s.heroIcon} aria-hidden>
              <ShieldCheck size={16} />
            </div>
            <div className={s.heroHead}>
              <span className={s.heroEyebrow}>
                <LiveDot
                  size={4}
                  tone={
                    kycKey === 'approved' ? 'success' : kycKey === 'danger' ? 'danger' : 'warning'
                  }
                />
                گیت اعتماد
              </span>
              <h2 className={s.heroTitle}>
                {STATUS_LABEL[profile.kycStatus] ?? profile.kycStatus}
              </h2>
              <span className={s.heroSub}>
                {KYC_LEVEL_LABEL[profile.kycLevel] ?? profile.kycLevel}
              </span>
            </div>
            <div className={s.heroProgress} aria-label={`پیشرفت: ${currentNum} از ۳`}>
              <span className={s.heroProgressValue}>{faNum(currentNum)}</span>
              <span className={s.heroProgressSlash}>/</span>
              <span className={s.heroProgressMax}>۳</span>
            </div>
          </div>

          <div className={s.heroCells}>
            <div
              className={s.heroCell}
              data-tone={profile.kycStatus === 'NOT_STARTED' ? 'danger' : 'success'}
            >
              <span className={s.heroCellLabel}>موبایل و تلگرام</span>
              <span className={s.heroCellValue}>
                {currentNum >= 1 ? 'تأیید شده' : 'ارسال نشده'}
              </span>
            </div>
            <div className={s.heroCell} data-tone={currentNum >= 2 ? 'success' : 'neutral'}>
              <span className={s.heroCellLabel}>مدرک و سلفی</span>
              <span className={s.heroCellValue}>{currentNum >= 2 ? 'تکمیل' : 'در انتظار'}</span>
            </div>
            <div className={s.heroCell} data-tone={currentNum >= 3 ? 'success' : 'neutral'}>
              <span className={s.heroCellLabel}>آدرس و صورتحساب</span>
              <span className={s.heroCellValue}>{currentNum >= 3 ? 'تأیید شد' : 'در انتظار'}</span>
            </div>
          </div>

          {profile.kycStatus === 'REJECTED' && (
            <div className={s.heroNote} data-tone="danger">
              <AlertTriangle size={11} aria-hidden />
              درخواست قبلی رد شد — مدارک جدید ارسال کنید یا با پشتیبانی تماس بگیرید.
            </div>
          )}
          {profile.kycStatus === 'APPROVED' && currentNum >= 3 && (
            <div className={s.heroNote} data-tone="success">
              <CheckCircle2 size={11} aria-hidden />
              حساب شما تأیید شد — همهٔ امکانات فعال است.
            </div>
          )}
          {profile.kycStatus === 'APPROVED' && currentNum < 3 && (
            <div className={s.heroNote} data-tone="success">
              <CheckCircle2 size={11} aria-hidden />
              سطح {faNum(currentNum)} تأیید شد — سطح بعدی آمادهٔ تکمیل است.
            </div>
          )}
          {profile.kycStatus === 'PENDING' && (
            <div className={s.heroNote} data-tone="warning">
              <LiveDot size={4} tone="warning" />
              مدارک شما در صف بررسی است — معمولاً کمتر از ۲۴ ساعت.
            </div>
          )}
        </div>
      </section>

      {/* ── Level Funnel ────────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader
          icon={ScanFace}
          title="مسیر احراز هویت"
          sub="۳ سطح — هر سطح بعد از تأیید قبلی باز می‌شود"
        />
        <ol className={s.funnel}>
          {(['LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as const).map((lvl, idx) => {
            const levelNum = idx + 1;
            const isDone = currentNum >= levelNum;
            const isCurrent = targetLevel === lvl;
            const icon = idx === 0 ? MessageCircle : idx === 1 ? IdCard : Landmark;
            const Icon = icon;
            return (
              <li
                key={lvl}
                className={s.funnelStep}
                data-done={isDone}
                data-current={isCurrent}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <span className={s.funnelDot} aria-hidden>
                  {isDone ? (
                    <CheckCircle2 size={11} />
                  ) : isCurrent ? (
                    <LiveDot size={6} tone="warning" />
                  ) : (
                    <Icon size={11} />
                  )}
                </span>
                <div className={s.funnelMain}>
                  <span className={s.funnelTitle}>{KYC_LEVEL_LABEL[lvl]}</span>
                  <span className={s.funnelDesc}>
                    {lvl === 'LEVEL_1' && 'تأیید شماره موبایل با کد تلگرام'}
                    {lvl === 'LEVEL_2' && 'مدرک هویتی + سلفی تأیید چهره'}
                    {lvl === 'LEVEL_3' && 'سند آدرس + صورت حساب بانکی'}
                  </span>
                </div>
                <span className={s.funnelState} data-done={isDone} data-current={isCurrent}>
                  {isDone ? 'تکمیل' : isCurrent ? 'جاری' : 'قفل'}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Next step / waiting ─────────────────────────────────────── */}
      {targetLevel && canOpenPortal && (
        <section className={s.section}>
          {hasPendingTarget ? (
            <div className={s.waitingBox} role="status">
              <span className={s.waitingIcon} aria-hidden>
                <LiveDot size={5} tone="warning" />
              </span>
              <div className={s.waitingMain}>
                <span className={s.waitingTitle}>
                  {targetOption
                    ? `${targetOption.title} در حال بررسی است`
                    : 'مدارک در حال بررسی است'}
                </span>
                <span className={s.waitingDesc}>
                  بعد از تأیید این سطح، سطح بعدی به‌صورت خودکار فعال می‌شود.
                </span>
              </div>
            </div>
          ) : (
            <>
              <SectionHeader
                icon={Upload}
                title="تکمیل احراز هویت"
                sub="سطح فعلی را تکمیل کنید تا سطح بعدی باز شود"
              />

              {/* نقشهٔ راه سطوح — وضعیت هر سطح */}
              <div className={s.levelPicker} role="group" aria-label="مراحل احراز هویت">
                {LEVEL_OPTIONS.map((opt, idx) => {
                  const levelNum = idx + 1;
                  const isDone = currentNum >= levelNum;
                  const isCurrent = targetLevel === opt.value;
                  const _isLocked = !isDone && !isCurrent;
                  const Icon =
                    opt.value === 'LEVEL_3'
                      ? Landmark
                      : opt.value === 'LEVEL_2'
                        ? ScanFace
                        : MessageCircle;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={s.levelCard}
                      data-level={opt.value}
                      data-state={isDone ? 'done' : isCurrent ? 'current' : 'locked'}
                      aria-pressed={isCurrent}
                      disabled={!isCurrent || isPending}
                      onClick={() => {
                        setError(null);
                        setDialogOpen(true);
                      }}
                    >
                      <span className={s.levelCardHead}>
                        <span className={s.levelCardIcon} aria-hidden>
                          {isDone ? <CheckCircle2 size={15} /> : <Icon size={15} />}
                        </span>
                        <span className={s.levelCardRadio} aria-hidden>
                          <CheckCircle2 size={13} strokeWidth={3} />
                        </span>
                      </span>
                      <span className={s.levelCardTitleWrap}>
                        <span className={s.levelCardTitle}>{opt.title}</span>
                        {opt.value === 'LEVEL_3' && (
                          <span className={s.levelCardFeatured}>بالاترین سقف</span>
                        )}
                      </span>
                      <span className={s.levelCardDesc}>{opt.desc}</span>
                      <span className={s.levelCardLimit}>
                        <Sparkles size={9} aria-hidden />
                        سقف روزانه {dailyLimitAf(opt.value)}
                      </span>
                      <span
                        className={s.levelCardState}
                        data-state={isDone ? 'done' : isCurrent ? 'current' : 'locked'}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 size={9} aria-hidden /> تکمیل
                          </>
                        ) : isCurrent ? (
                          <>
                            <Upload size={9} aria-hidden /> تکمیل کن
                          </>
                        ) : (
                          <>
                            <Lock size={9} aria-hidden /> قفل
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {targetOption && (
                <Dialog
                  open={dialogOpen}
                  onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}
                >
                  <DialogContent className="at-dialog-content max-h-[92vh] w-full max-w-2xl overflow-y-auto p-0 rtl">
                    <DialogHeader className="at-dialog-header">
                      <DialogTitle className="at-dialog-title">
                        <span className={s.dialogTitleIcon} aria-hidden>
                          {targetLevel === 'LEVEL_1' ? (
                            <MessageCircle size={14} />
                          ) : targetLevel === 'LEVEL_2' ? (
                            <ScanFace size={14} />
                          ) : (
                            <Landmark size={14} />
                          )}
                        </span>
                        {targetOption.title}
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        {targetOption.desc} — سقف روزانه {dailyLimitAf(targetLevel)}
                      </DialogDescription>
                    </DialogHeader>

                    <div className={s.dialogBody}>
                      <p className={s.dialogLead}>
                        {targetOption.desc} —{' '}
                        <span className={s.dialogLimit}>
                          <Sparkles size={10} aria-hidden />
                          سقف روزانه {dailyLimitAf(targetLevel)}
                        </span>
                      </p>

                      <form
                        onSubmit={targetLevel === 'LEVEL_1' ? handleSendOtp : handleSubmit}
                        className={s.form}
                        noValidate
                      >
                        {targetLevel === 'LEVEL_1' ? (
                          <div className={s.formGrid}>
                            <div className={s.formField} data-span="full">
                              <label htmlFor="phone" className={s.formLabel}>
                                شماره موبایل
                              </label>
                              <div className={s.phoneRow}>
                                {/* کد کشور سمت چپِ شماره — چون اعداد از چپ خوانده می‌شوند */}
                                <input
                                  id="phone"
                                  type="tel"
                                  className={`${s.formControl} ${s.phoneInput}`}
                                  value={phone}
                                  onChange={(e) =>
                                    setPhone(e.target.value.replace(/[^0-9+\s-]/g, ''))
                                  }
                                  placeholder="۰۷۰ ۱۲۳ ۴۵۶۷"
                                  disabled={isPending || otpPending}
                                  autoComplete="tel-national"
                                  dir="ltr"
                                />
                                <Select
                                  value={dialCode}
                                  onValueChange={setDialCode}
                                  disabled={isPending || otpPending}
                                >
                                  <SelectTrigger
                                    className={`${s.formControl} ${s.formSelectTrigger} ${s.dialSelect}`}
                                    aria-label="کد کشور"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PHONE_COUNTRIES.map((o) => (
                                      <SelectItem key={o.dial} value={o.dial}>
                                        <span className={s.dialItem}>
                                          <span aria-hidden>{o.flag}</span>
                                          {o.label} {o.dial}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <span className={s.formHint}>
                                کد تأیید به تلگرام شما ارسال می‌شود — {dialCode} پیش‌فرض است.
                              </span>
                            </div>

                            {otpSent ? (
                              <div className={s.formField} data-span="full">
                                <label htmlFor="otp" className={s.formLabel}>
                                  کد تأیید
                                </label>
                                <input
                                  id="otp"
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={6}
                                  className={`${s.formControl} ${s.otpInput}`}
                                  value={otpCode}
                                  onChange={(e) =>
                                    setOtpCode(e.target.value.replace(/[^0-9]/g, ''))
                                  }
                                  placeholder="••••••"
                                  dir="ltr"
                                  autoComplete="one-time-code"
                                />
                                {otpInfo && <span className={s.formHint}>{otpInfo}</span>}
                                {devCode && (
                                  <span className={s.devCodeHint}>
                                    کد تست (فقط توسعه): <b dir="ltr">{devCode}</b>
                                  </span>
                                )}
                                {telegramUrl && (
                                  <a
                                    href={telegramUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={s.telegramLink}
                                  >
                                    <MessageCircle size={11} aria-hidden />
                                    اتصال تلگرام (اختیاری) — کدها مستقیم در تلگرام
                                  </a>
                                )}
                              </div>
                            ) : (
                              otpInfo && (
                                <div className={s.formField} data-span="full">
                                  <span className={s.formHint}>{otpInfo}</span>
                                  {telegramUrl && (
                                    <a
                                      href={telegramUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={s.telegramLink}
                                    >
                                      <MessageCircle size={11} aria-hidden />
                                      اتصال تلگرام (اختیاری)
                                    </a>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <>
                            <div className={s.formGrid}>
                              <div className={s.formField}>
                                <label htmlFor="docType" className={s.formLabel}>
                                  نوع مدرک
                                </label>
                                <Select
                                  value={docType}
                                  onValueChange={setDocType}
                                  disabled={isPending}
                                >
                                  <SelectTrigger
                                    id="docType"
                                    className={`${s.formControl} ${s.formSelectTrigger}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DOC_TYPE_OPTIONS.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className={s.formField}>
                                <label htmlFor="docNumber" className={s.formLabel}>
                                  شماره مدرک
                                </label>
                                <input
                                  id="docNumber"
                                  type="text"
                                  className={s.formControl}
                                  value={docNumber}
                                  onChange={(e) => setDocNumber(e.target.value)}
                                  placeholder="مثال: ۰۰۱۲۳۴۵۶۷۸"
                                  disabled={isPending}
                                  autoComplete="off"
                                  maxLength={30}
                                  required
                                  dir="ltr"
                                />
                              </div>

                              <div className={s.formField} data-span="full">
                                <ImageUploader
                                  initialPreviews={fileUrl ? [fileUrl] : []}
                                  onImageUpload={handleImageUpload}
                                  onImageRemove={handleImageRemove}
                                  maxFiles={1}
                                  multiple={false}
                                  folder="kyc"
                                  thumbSize="xl"
                                  label="تصویر مدرک"
                                  hint="تصویر واضح از مدرک انتخاب‌شده — JPG، PNG، WebP، GIF، SVG"
                                  disabled={isPending}
                                />
                                <span className={s.formHint}>
                                  فایل به‌صورت امن در سرور ما ذخیره می‌شود و فقط برای بررسی توسط تیم
                                  استفاده می‌شود.
                                </span>
                              </div>

                              <div className={s.formField} data-span="full">
                                <ImageUploader
                                  initialPreviews={selfieUrl ? [selfieUrl] : []}
                                  onImageUpload={handleSelfieUpload}
                                  onImageRemove={handleSelfieRemove}
                                  maxFiles={1}
                                  multiple={false}
                                  folder="kyc"
                                  thumbSize="xl"
                                  label="سلفی در کنار مدرک (تأیید چهره)"
                                  hint="عکس واضح از چهره در کنار مدرک شناسایی — JPG، PNG، WebP"
                                  disabled={isPending}
                                />
                              </div>
                            </div>

                            {targetLevel === 'LEVEL_3' && (
                              <div className={s.formGrid}>
                                <div className={s.formField}>
                                  <label htmlFor="city" className={s.formLabel}>
                                    شهر
                                  </label>
                                  <input
                                    id="city"
                                    type="text"
                                    className={s.formControl}
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="مثال: کابل"
                                    disabled={isPending}
                                    autoComplete="address-level2"
                                    maxLength={120}
                                    required
                                  />
                                </div>
                                <div className={s.formField}>
                                  <label htmlFor="address" className={s.formLabel}>
                                    آدرس کامل
                                  </label>
                                  <input
                                    id="address"
                                    type="text"
                                    className={s.formControl}
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="مثال: ناحیه ۳، خیابان …"
                                    disabled={isPending}
                                    autoComplete="street-address"
                                    maxLength={300}
                                    required
                                  />
                                </div>
                                <div className={s.formField} data-span="full">
                                  <ImageUploader
                                    initialPreviews={addressDocUrl ? [addressDocUrl] : []}
                                    onImageUpload={handleAddressDocUpload}
                                    onImageRemove={handleAddressDocRemove}
                                    maxFiles={1}
                                    multiple={false}
                                    folder="kyc"
                                    thumbSize="xl"
                                    label="سند اثبات آدرس (قبض برق، گاز، اینترنت و…)"
                                    hint="قبض یا سندی که نام و آدرس شما روی آن باشد — JPG، PNG، WebP"
                                    disabled={isPending}
                                  />
                                </div>
                                <div className={s.formField} data-span="full">
                                  <ImageUploader
                                    initialPreviews={bankStatementUrl ? [bankStatementUrl] : []}
                                    onImageUpload={handleBankStatementUpload}
                                    onImageRemove={handleBankStatementRemove}
                                    maxFiles={1}
                                    multiple={false}
                                    folder="kyc"
                                    thumbSize="xl"
                                    label="صورت حساب بانکی"
                                    hint="صورت حساب بانکی اخیر (حداکثر ۳ ماه) — JPG، PNG، PDF"
                                    disabled={isPending}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {error && (
                          <div className={s.errorBox} role="alert">
                            <AlertTriangle size={12} aria-hidden />
                            {error}
                          </div>
                        )}

                        <div className={s.formFoot}>
                          {targetLevel === 'LEVEL_1' ? (
                            !otpSent ? (
                              <button
                                type="submit"
                                className={s.submitBtn}
                                disabled={isPending || otpPending}
                              >
                                {otpPending ? (
                                  <Loader2 size={13} className={s.iconSpin} aria-hidden />
                                ) : (
                                  <MessageCircle size={13} aria-hidden />
                                )}
                                {otpPending ? 'در حال ارسال...' : 'ارسال کد تأیید'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={s.submitBtn}
                                disabled={isPending || otpCode.length < 4}
                                onClick={handlePhoneSubmit}
                              >
                                {isPending ? (
                                  <Loader2 size={13} className={s.iconSpin} aria-hidden />
                                ) : (
                                  <CheckCircle2 size={13} aria-hidden />
                                )}
                                {isPending ? 'در حال ثبت...' : 'تأیید و ثبت سطح ۱'}
                              </button>
                            )
                          ) : (
                            <button type="submit" className={s.submitBtn} disabled={isPending}>
                              {isPending ? (
                                <Loader2 size={13} className={s.iconSpin} aria-hidden />
                              ) : (
                                <ArrowLeft size={13} aria-hidden />
                              )}
                              {isPending ? 'در حال ارسال...' : 'ارسال برای بررسی'}
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </section>
      )}

      {success && (
        <output className={s.successBox}>
          <CheckCircle2 size={12} aria-hidden />
          {successLevel === 'LEVEL_1'
            ? 'شماره موبایل تأیید شد — سطح بعدی باز شد.'
            : 'مدارک با موفقیت ارسال شد و در صف بررسی قرار گرفت.'}
        </output>
      )}

      {/* ── History ─────────────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader
          icon={FileText}
          title="سابقهٔ مدارک"
          sub={`${faNum(records.length)} مدرک ثبت‌شده`}
        />
        {records.length === 0 ? (
          <EmptyHint
            icon={FileText}
            title="سابقه‌ای وجود ندارد"
            description="تا به حال هیچ مدرکی ارسال نشده است"
          />
        ) : (
          <ol className={s.historyList}>
            {records.map((rec, i) => {
              const statusKey = KYC_STATUS_CSSKEY[rec.status] ?? 'warning';
              return (
                <li
                  key={rec.id}
                  className={s.historyRow}
                  data-status={rec.status}
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                >
                  <StatusRail variant={statusKey} />
                  <span className={s.historyIcon} aria-hidden>
                    <KycStatusIcon status={rec.status} />
                  </span>
                  <div className={s.historyMain}>
                    <div className={s.historyTopRow}>
                      <span className={s.historyDocType}>
                        {DOC_TYPE_LABEL[rec.docType] ?? rec.docType}
                      </span>
                      <span className={s.historyLevel}>
                        {KYC_LEVEL_LABEL[rec.level] ?? rec.level}
                      </span>
                    </div>
                    {rec.docNumber && (
                      <span className={s.historyDocNumber} dir="ltr">
                        شماره: {rec.docNumber}
                      </span>
                    )}
                    {rec.rejectReason && (
                      <span className={s.historyReject}>دلیل رد: {rec.rejectReason}</span>
                    )}
                    {rec.expiresAt && (
                      <span className={s.historyMeta}>انقضا: {faDate(rec.expiresAt)}</span>
                    )}
                  </div>
                  <div className={s.historyRight}>
                    <StatusPill variant={statusKey}>
                      <CircleDot size={8} aria-hidden className={s.dotGap} />
                      {STATUS_LABEL[rec.status] ?? rec.status}
                    </StatusPill>
                    <span className={s.historyDate} title={faDateTime(rec.createdAt)}>
                      {faDate(rec.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
