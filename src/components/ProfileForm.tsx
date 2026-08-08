'use client';

import { updateProfile } from '@/actions/profile';
import { TwoFactorSection } from '@/components/Dashboard/Profile/TwoFactorSection';
import { FormField } from '@/components/Dashboard/primitives/FormField';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { UpdateProfileSchema } from '@/schemas';
import type { UpdateProfileInput, UserWithProfile } from '@/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Camera,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  KeyRound,
  Lock,
  Shield,
  User,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import ImageUploadDialog from './ImageUpload/ImageUploadDialog';
import s from './ProfileForm.module.css';

/* ─── constants ───────────────────────────────────────────────────────────── */

const COVER_PLACEHOLDER = '/images/placeholder-small.png';
const BIO_MAX = 300;

/* ─── nav tabs ────────────────────────────────────────────────────────────── */

type NavTab = 'info' | 'security';

/* ─── password strength helper ───────────────────────────────────────────── */

function getPasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_LABELS: Record<number, string> = {
  0: '',
  1: 'ضعیف',
  2: 'متوسط',
  3: 'خوب',
  4: 'قوی',
};

const STRENGTH_ACTIVE: Record<number, 'weak' | 'fair' | 'good' | 'strong'> = {
  1: 'weak',
  2: 'fair',
  3: 'good',
  4: 'strong',
};

/* ─── profile completion score ───────────────────────────────────────────── */

function getCompletionPercent(data: UserWithProfile): number {
  let score = 0;
  const checks = [
    !!data.name,
    !!data.email,
    !!data.phoneNumber,
    !!data.profile?.bio,
    !!data.profile?.jobName,
    !!data.profile?.avatar,
    !!data.profile?.bgImage,
  ];
  checks.forEach((c) => {
    if (c) score++;
  });
  return Math.round((score / checks.length) * 100);
}

/* ─── role label ──────────────────────────────────────────────────────────── */

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'مالک',
  SUPERADMIN: 'سوپر ادمین',
  ADMIN: 'مدیر',
  AUTHOR: 'نویسنده',
  USER: 'کاربر',
};

/* ─── types ───────────────────────────────────────────────────────────────── */

interface ProfileFormProps {
  initialData: UserWithProfile;
}

/* ─── helper — submit wrapper ─────────────────────────────────────────────── */

async function submitProfile(
  formData: FormData,
  router: ReturnType<typeof useRouter>,
  successMessage: string,
): Promise<boolean> {
  const result = await updateProfile(formData);
  toast({
    title: result.success ? 'موفقیت' : 'خطا',
    description: result.success ? successMessage : result.message,
    variant: result.success ? 'success' : 'destructive',
  });
  if (result.success && result.redirect) {
    router.push(result.redirect);
  }
  return result.success;
}

/* ─── component ───────────────────────────────────────────────────────────── */

const ProfileForm: React.FC<ProfileFormProps> = ({ initialData }) => {
  const router = useRouter();

  /* ── nav ── */
  const [activeTab, setActiveTab] = useState<NavTab>('info');

  /* ── image state ── */
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isBgImageDialogOpen, setIsBgImageDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(initialData.profile?.avatar ?? '');
  const [bgImagePreview, setBgImagePreview] = useState(initialData.profile?.bgImage ?? '');

  /* ── submit states ── */
  const [isInfoSubmitting, setIsInfoSubmitting] = useState(false);
  const [isSecuritySubmitting, setIsSecuritySubmitting] = useState(false);

  /* ── password visibility ── */
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* ── live derived values ── */
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [bioValue, setBioValue] = useState(initialData.profile?.bio ?? '');

  const hasPhone = !!initialData.phoneNumber;

  /* ── completion ── */
  const completionPercent = useMemo(
    () =>
      getCompletionPercent({
        ...initialData,
        profile: {
          ...initialData.profile,
          avatar: avatarPreview || initialData.profile?.avatar,
          bgImage: bgImagePreview || initialData.profile?.bgImage,
          bio: bioValue || initialData.profile?.bio,
        } as typeof initialData.profile,
      }),
    [initialData, avatarPreview, bgImagePreview, bioValue],
  );

  /* ─────────────────────────────────────────────────────────────────────────
     Form 1 — Info
   ───────────────────────────────────────────────────────────────────────── */
  const {
    register: infoReg,
    handleSubmit: handleInfoSubmit,
    formState: { errors: infoErrors, isDirty: infoIsDirty },
    setValue: infoSetValue,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      name: initialData.name ?? '',
      email: initialData.email ?? '',
      phoneNumber: initialData.phoneNumber ?? '',
      bio: initialData.profile?.bio ?? '',
      jobName: initialData.profile?.jobName ?? '',
      bgImage: initialData.profile?.bgImage ?? '',
    },
  });

  /* ─────────────────────────────────────────────────────────────────────────
     Form 2 — Security
   ───────────────────────────────────────────────────────────────────────── */
  const {
    register: secReg,
    handleSubmit: handleSecSubmit,
    formState: { errors: secErrors },
    reset: resetSecurity,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  /* ── password strength ── */
  const passwordStrength = useMemo(() => getPasswordStrength(newPasswordValue), [newPasswordValue]);

  const passwordsMatch =
    confirmPasswordValue.length > 0 && confirmPasswordValue === newPasswordValue;
  const passwordsMismatch =
    confirmPasswordValue.length > 0 && confirmPasswordValue !== newPasswordValue;

  /* ── image handlers ── */
  const handleImageUpload = useCallback(
    (urls: string[], type: 'avatar' | 'bgImage') => {
      if (urls.length > 0) {
        if (type === 'avatar') {
          setAvatarPreview(urls[0]);
          infoSetValue('imageUrl', urls[0], { shouldDirty: true });
        } else {
          setBgImagePreview(urls[0]);
          infoSetValue('bgImage', urls[0], { shouldDirty: true });
        }
      }
    },
    [infoSetValue],
  );

  const handleImageRemove = useCallback(
    (type: 'avatar' | 'bgImage') => {
      if (type === 'avatar') {
        setAvatarPreview('');
        infoSetValue('imageUrl', '', { shouldDirty: true });
      } else {
        setBgImagePreview('');
        infoSetValue('bgImage', '', { shouldDirty: true });
      }
    },
    [infoSetValue],
  );

  /* ── submit handlers ── */
  const onInfoSubmit = async (data: UpdateProfileInput) => {
    setIsInfoSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name || '');
      formData.append('email', data.email || '');
      formData.append('phoneNumber', data.phoneNumber || '');
      formData.append('bio', data.bio || '');
      formData.append('jobName', data.jobName || '');
      formData.append('imageUrl', avatarPreview || '');
      formData.append('bgImage', bgImagePreview || '');
      await submitProfile(formData, router, 'پروفایل با موفقیت بروزرسانی شد');
    } catch {
      toast({ title: 'خطا', description: 'خطا در بروزرسانی پروفایل', variant: 'destructive' });
    } finally {
      setIsInfoSubmitting(false);
    }
  };

  const onSecuritySubmit = async (data: UpdateProfileInput) => {
    setIsSecuritySubmitting(true);
    try {
      const formData = new FormData();
      if (data.currentPassword) formData.append('currentPassword', data.currentPassword);
      if (data.newPassword) formData.append('newPassword', data.newPassword);
      if (data.confirmNewPassword) formData.append('confirmNewPassword', data.confirmNewPassword);
      const ok = await submitProfile(formData, router, 'رمز عبور با موفقیت تغییر کرد');
      if (ok) {
        resetSecurity();
        setNewPasswordValue('');
        setConfirmPasswordValue('');
      }
    } catch {
      toast({ title: 'خطا', description: 'خطا در تغییر رمز عبور', variant: 'destructive' });
    } finally {
      setIsSecuritySubmitting(false);
    }
  };

  const coverSrc = bgImagePreview || COVER_PLACEHOLDER;
  const userRoleLabel = ROLE_LABEL[initialData.role as string] ?? 'کاربر';

  return (
    <div className={s.root} dir="rtl">
      {/* ── Phone verification alert ─────────────────────────────────────────── */}
      {!hasPhone && (
        <Alert variant="warning">
          <AlertTitle>شماره موبایل تأیید نشده</AlertTitle>
          <AlertDescription>
            برای استفاده از خدمات مالی (حواله، خرید ارز، رمزارز) باید شماره موبایل خود را وارد کنید.
          </AlertDescription>
        </Alert>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          IDENTITY PANEL — Cover + Avatar + User Meta
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={s.identityPanel}>
        {/* Cover strip */}
        <div className={s.cover}>
          <Image
            src={coverSrc}
            alt="تصویر پس‌زمینه"
            fill
            sizes="100vw"
            className={cn('object-cover', !bgImagePreview && s.coverPlaceholder)}
            priority
          />
          {/* Cover edit btn */}
          <button
            type="button"
            className={s.coverBtn}
            aria-label="تغییر تصویر کاور"
            onClick={() => setIsBgImageDialogOpen(true)}
          >
            <ImageIcon size={13} aria-hidden />
            {bgImagePreview ? 'تغییر کاور' : 'افزودن کاور'}
          </button>
        </div>

        {/* Avatar + meta row */}
        <div className={s.identityBody}>
          {/* Avatar */}
          <div className={s.avatarWrap}>
            <button
              type="button"
              className={s.avatarTrigger}
              onClick={() => setIsAvatarDialogOpen(true)}
              aria-label="تغییر آواتار"
            >
              <span className={s.avatar}>
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="تصویر پروفایل"
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <span className={s.avatarFallback}>
                    <User size={30} aria-hidden />
                  </span>
                )}
              </span>
              <span className={s.avatarEditBadge} aria-hidden>
                <Camera size={11} />
              </span>
            </button>
          </div>

          {/* User meta */}
          <div className={s.userMeta}>
            <h2 className={s.userName}>{initialData.name || 'کاربر ناشناس'}</h2>
            {initialData.email && <p className={s.userEmail}>{initialData.email}</p>}
            <span className={s.userRole}>{userRoleLabel}</span>

            {/* Completion bar */}
            <div className={s.completionWrap} aria-label={`تکمیل پروفایل: ${completionPercent}٪`}>
              <span className={s.completionText}>تکمیل پروفایل: {completionPercent}٪</span>
              <div
                className={s.completionBar}
                role="progressbar"
                aria-valuenow={completionPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className={s.completionFill} style={{ width: `${completionPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LAYOUT: sidebar nav + content
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={s.layout}>
        {/* ── Sidebar Nav ─────────────────────────────────────────────────── */}
        <nav className={s.sideNav} aria-label="بخش‌های پروفایل">
          <button
            type="button"
            className={s.navItem}
            data-active={activeTab === 'info'}
            aria-selected={activeTab === 'info'}
            onClick={() => setActiveTab('info')}
          >
            <User size={15} className={s.navItemIcon} aria-hidden />
            اطلاعات پروفایل
          </button>
          <button
            type="button"
            className={s.navItem}
            data-active={activeTab === 'security'}
            aria-selected={activeTab === 'security'}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={15} className={s.navItemIcon} aria-hidden />
            امنیت حساب
          </button>
        </nav>

        {/* ── Content area ────────────────────────────────────────────────── */}
        <div className={s.contentArea}>
          {/* ── Panel: Profile Info ──────────────────────────────────────── */}
          {activeTab === 'info' && (
            <form onSubmit={handleInfoSubmit(onInfoSubmit)} noValidate className={s.section}>
              {/* Personal info card */}
              <section className={s.card}>
                <header className={s.cardHeader}>
                  <span className={cn(s.cardIcon, 'dash-ico dash-ico--indigo')} aria-hidden>
                    <User size={16} />
                  </span>
                  <div>
                    <h3 className={s.cardTitle}>اطلاعات شخصی</h3>
                    <p className={s.cardDesc}>نام، ایمیل و شماره موبایل شما</p>
                  </div>
                </header>

                <div className={s.formGrid}>
                  {/* Name */}
                  <FormField label="نام" error={infoErrors.name?.message} required>
                    <Input
                      id="name"
                      {...infoReg('name')}
                      placeholder="نام خود را وارد کنید"
                      aria-invalid={!!infoErrors.name}
                      autoComplete="name"
                    />
                  </FormField>

                  {/* Job */}
                  <FormField label="شغل" error={infoErrors.jobName?.message}>
                    <Input
                      id="jobName"
                      {...infoReg('jobName')}
                      placeholder="عنوان شغلی"
                      aria-invalid={!!infoErrors.jobName}
                      autoComplete="organization-title"
                    />
                  </FormField>

                  {/* Email */}
                  <FormField
                    label="ایمیل"
                    hint="در صورت تغییر، کد تأیید به ایمیل جدید ارسال می‌شود"
                    error={infoErrors.email?.message}
                    required
                  >
                    <Input
                      id="email"
                      {...infoReg('email')}
                      type="email"
                      dir="ltr"
                      placeholder="example@mail.com"
                      aria-invalid={!!infoErrors.email}
                      autoComplete="email"
                      className="text-start"
                    />
                  </FormField>

                  {/* Phone */}
                  <FormField
                    label="شماره موبایل"
                    hint="فرمت: 0701234567 یا +93701234567"
                    error={infoErrors.phoneNumber?.message}
                  >
                    <Input
                      id="phoneNumber"
                      {...infoReg('phoneNumber')}
                      type="tel"
                      dir="ltr"
                      placeholder="0701234567"
                      aria-invalid={!!infoErrors.phoneNumber}
                      autoComplete="tel"
                      className="text-start"
                    />
                  </FormField>
                </div>
              </section>

              {/* Bio card */}
              <section className={s.card}>
                <header className={s.cardHeader}>
                  <span className={cn(s.cardIcon, 'dash-ico dash-ico--violet')} aria-hidden>
                    <FileText size={16} />
                  </span>
                  <div>
                    <h3 className={s.cardTitle}>درباره شما</h3>
                    <p className={s.cardDesc}>نمایه‌ی عمومی در سایت</p>
                  </div>
                </header>

                <FormField label="بیوگرافی" error={infoErrors.bio?.message}>
                  <div className={s.textareaWrap}>
                    <Textarea
                      id="bio"
                      {...infoReg('bio', {
                        onChange: (e) => setBioValue(e.target.value),
                      })}
                      rows={5}
                      maxLength={BIO_MAX}
                      placeholder="درباره خودتان بنویسید…"
                      aria-invalid={!!infoErrors.bio}
                      className={cn('resize-none', s.textarea)}
                    />
                    <span
                      className={cn(
                        s.charCount,
                        bioValue.length > BIO_MAX * 0.9 && s.charCountWarn,
                      )}
                      aria-live="polite"
                      aria-label={`${bioValue.length} از ${BIO_MAX} کاراکتر`}
                    >
                      {bioValue.length}/{BIO_MAX}
                    </span>
                  </div>
                </FormField>
              </section>

              {/* Action row */}
              <div className={s.actions}>
                {infoIsDirty && (
                  <span className={s.unsavedBadge} role="status" aria-live="polite">
                    <span className={s.unsavedDot} aria-hidden />
                    تغییرات ذخیره‌نشده
                  </span>
                )}
                <Button type="submit" disabled={isInfoSubmitting} className="min-w-[140px]">
                  {isInfoSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className={s.spinner} role="status" aria-label="در حال بارگذاری" />
                      در حال ذخیره…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Check size={15} aria-hidden />
                      ذخیره تغییرات
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ── Panel: Security ──────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <form onSubmit={handleSecSubmit(onSecuritySubmit)} noValidate className={s.section}>
              <section className={s.card}>
                <header className={s.cardHeader}>
                  <span className={cn(s.cardIcon, 'dash-ico dash-ico--amber')} aria-hidden>
                    <KeyRound size={16} />
                  </span>
                  <div>
                    <h3 className={s.cardTitle}>تغییر رمز عبور</h3>
                    <p className={s.cardDesc}>رمز قوی با حداقل ۸ کاراکتر استفاده کنید</p>
                  </div>
                </header>

                {/* Current password — full width */}
                <FormField label="رمز عبور فعلی" error={secErrors.currentPassword?.message}>
                  <div className={s.passField}>
                    <Input
                      id="currentPassword"
                      {...secReg('currentPassword')}
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="رمز عبور فعلی خود را وارد کنید"
                      aria-invalid={!!secErrors.currentPassword}
                      autoComplete="current-password"
                      className="pe-10"
                    />
                    <button
                      type="button"
                      className={s.passToggle}
                      onClick={() => setShowCurrentPassword((p) => !p)}
                      aria-label={showCurrentPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={15} aria-hidden />
                      ) : (
                        <Eye size={15} aria-hidden />
                      )}
                    </button>
                  </div>
                </FormField>

                <div className={s.formGrid}>
                  {/* New password */}
                  <div>
                    <FormField label="رمز عبور جدید" error={secErrors.newPassword?.message}>
                      <div className={s.passField}>
                        <Input
                          id="newPassword"
                          {...secReg('newPassword', {
                            onChange: (e) => setNewPasswordValue(e.target.value),
                          })}
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="رمز عبور جدید"
                          aria-invalid={!!secErrors.newPassword}
                          autoComplete="new-password"
                          className="pe-10"
                        />
                        <button
                          type="button"
                          className={s.passToggle}
                          onClick={() => setShowNewPassword((p) => !p)}
                          aria-label={showNewPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                        >
                          {showNewPassword ? (
                            <EyeOff size={15} aria-hidden />
                          ) : (
                            <Eye size={15} aria-hidden />
                          )}
                        </button>
                      </div>
                    </FormField>

                    {/* Strength bar */}
                    {newPasswordValue && (
                      <div className={s.strengthWrap}>
                        <div className={s.strengthBar} aria-hidden>
                          {[1, 2, 3, 4].map((seg) => (
                            <div
                              key={seg}
                              className={s.strengthSegment}
                              data-active={
                                seg <= passwordStrength
                                  ? STRENGTH_ACTIVE[passwordStrength]
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                        <p
                          className={s.strengthLabel}
                          aria-live="polite"
                          aria-label={`قدرت رمز: ${STRENGTH_LABELS[passwordStrength]}`}
                        >
                          قدرت رمز:{' '}
                          <span data-strength={STRENGTH_ACTIVE[passwordStrength] ?? 'empty'}>
                            {STRENGTH_LABELS[passwordStrength]}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <FormField
                      label="تکرار رمز عبور جدید"
                      error={secErrors.confirmNewPassword?.message}
                    >
                      <div className={s.passField}>
                        <Input
                          id="confirmNewPassword"
                          {...secReg('confirmNewPassword', {
                            onChange: (e) => setConfirmPasswordValue(e.target.value),
                          })}
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="تکرار رمز عبور جدید"
                          aria-invalid={!!secErrors.confirmNewPassword || passwordsMismatch}
                          autoComplete="new-password"
                          className="pe-10"
                        />
                        <button
                          type="button"
                          className={s.passToggle}
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          aria-label={showConfirmPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={15} aria-hidden />
                          ) : (
                            <Eye size={15} aria-hidden />
                          )}
                        </button>
                      </div>
                    </FormField>

                    {/* Match indicator */}
                    {confirmPasswordValue.length > 0 && (
                      <p
                        className={cn(s.matchStatus, passwordsMatch ? s.matchOk : s.matchFail)}
                        aria-live="polite"
                      >
                        {passwordsMatch ? (
                          <>
                            <CheckCircle2 size={12} aria-hidden />
                            رمزها یکسان هستند
                          </>
                        ) : (
                          <>
                            <XCircle size={12} aria-hidden />
                            رمزها مطابقت ندارند
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Security tip */}
                <div className={s.tip}>
                  <Lock size={13} className={s.tipIcon} aria-hidden />
                  <p className={s.tipText}>
                    رمز قوی شامل حداقل ۸ کاراکتر، ترکیبی از حروف بزرگ و کوچک انگلیسی، اعداد و
                    نمادهاست. رمز خود را در جایی امن نگه دارید.
                  </p>
                </div>
              </section>

              {/* Action row */}
              <div className={s.actions}>
                <Button type="submit" disabled={isSecuritySubmitting} className="min-w-[160px]">
                  {isSecuritySubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className={s.spinner} role="status" aria-label="در حال بارگذاری" />
                      در حال ذخیره…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Shield size={15} aria-hidden />
                      بروزرسانی امنیت
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ── 2FA panel — independent of the password form above ───── */}
          {activeTab === 'security' && (
            <div className={s.section}>
              <TwoFactorSection userEmail={initialData.email} />
            </div>
          )}
        </div>
      </div>

      {/* ── Image upload dialogs ─────────────────────────────────────────────── */}
      <ImageUploadDialog
        isOpen={isAvatarDialogOpen}
        onClose={() => setIsAvatarDialogOpen(false)}
        onImageUpload={(urls) => handleImageUpload(urls, 'avatar')}
        onImageRemove={() => handleImageRemove('avatar')}
        initialPreview={avatarPreview}
        title="تغییر آواتار"
        folder="avatars"
      />
      <ImageUploadDialog
        isOpen={isBgImageDialogOpen}
        onClose={() => setIsBgImageDialogOpen(false)}
        onImageUpload={(urls) => handleImageUpload(urls, 'bgImage')}
        onImageRemove={() => handleImageRemove('bgImage')}
        initialPreview={bgImagePreview}
        title="تغییر تصویر پس‌زمینه"
        folder="avatars"
      />
    </div>
  );
};

export default ProfileForm;
