'use client';

import {
  generateApiKey,
  getSystemSettings,
  testDatabaseConnection,
  testSmtpConnection,
  updateCacheSettings,
  updateEmailSettings,
  updateGeneralSettings,
} from '@/actions/settingsActions';
import SocialLinksManager from '@/components/Dashboard/Settings/SocialLinksManager';
import { PageHeader } from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import {
  Check,
  CheckCircle2,
  Database,
  ImageIcon,
  Loader2,
  type LucideIcon,
  Mail,
  RefreshCw,
  Settings,
  Share2,
  Shield,
  Upload,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import s from './settings.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TabType {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
}

const TABS: TabType[] = [
  { id: 'general', name: 'تنظیمات عمومی', desc: 'هویت سایت', icon: Settings },
  { id: 'email', name: 'ایمیل / SMTP', desc: 'پیکربندی ارسال', icon: Mail },
  { id: 'security', name: 'امنیت', desc: 'دسترسی و رمز', icon: Shield },
  { id: 'social', name: 'شبکه‌های اجتماعی', desc: 'لینک‌های خارجی', icon: Share2 },
  { id: 'database', name: 'پایگاه داده', desc: 'اتصال و backup', icon: Database },
  { id: 'advanced', name: 'پیشرفته', desc: 'cache و API', icon: Wrench },
];

interface FormData {
  general: { siteTitle: string; siteDescription: string; contactEmail: string; logoUrl: string };
  email: { smtpServer: string; smtpPort: string; smtpUsername: string; smtpPassword: string };
  security: {
    twoFactorAuth: boolean;
    ipRestriction: boolean;
    minPasswordLength: number;
    sessionDuration: number;
  };
  social: { instagram: string; telegram: string; whatsapp: string; twitter: string };
  database: {
    server: string;
    port: string;
    name: string;
    username: string;
    password: string;
    type: string;
    autoBackup: boolean;
  };
  advanced: {
    debugMode: boolean;
    cacheEnabled: boolean;
    apiRateLimit: boolean;
    cacheDuration: number;
    maxUploadSize: number;
    errorLevel: string;
    logPath: string;
    apiKey: string;
    cacheStorage: string;
    rateLimit: number;
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  onChange,
  disabled,
}: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      disabled={disabled}
      className={s.switch}
    >
      <span className={s.switchThumb} />
    </button>
  );
}

function ToggleRow({
  title,
  desc,
  enabled,
  onChange,
  disabled,
}: { title: string; desc: string; enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div className={s.toggleRow}>
      <div className={s.toggleRowText}>
        <span className={s.toggleTitle}>{title}</span>
        <span className={s.toggleDesc}>{desc}</span>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function SaveBtn({ loading, onClick }: { loading: boolean; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button type="button" onClick={onClick} disabled={loading} className="at-btn at-btn--primary">
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        {loading ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [form, setForm] = useState<FormData>({
    general: { siteTitle: '', siteDescription: '', contactEmail: '', logoUrl: '' },
    email: { smtpServer: '', smtpPort: '', smtpUsername: '', smtpPassword: '' },
    security: {
      twoFactorAuth: false,
      ipRestriction: false,
      minPasswordLength: 8,
      sessionDuration: 30,
    },
    social: { instagram: '', telegram: '', whatsapp: '', twitter: '' },
    database: {
      server: '',
      port: '',
      name: '',
      username: '',
      password: '',
      type: 'postgresql',
      autoBackup: false,
    },
    advanced: {
      debugMode: false,
      cacheEnabled: true,
      apiRateLimit: true,
      cacheDuration: 60,
      maxUploadSize: 10,
      errorLevel: 'error',
      logPath: '',
      apiKey: '',
      cacheStorage: 'memory',
      rateLimit: 100,
    },
  });

  // ── Load initial settings ──────────────────────────────────────────────────
  useEffect(() => {
    getSystemSettings()
      .then((result) => {
        if (result.success && result.data) {
          const d = result.data;
          setForm((prev) => ({
            ...prev,
            general: {
              ...prev.general,
              siteTitle: d.siteName || '',
              siteDescription: d.siteDescription || '',
              logoUrl: d.logoUrl || '',
            },
            email: {
              ...prev.email,
              smtpServer: d.smtpServer || '',
              smtpPort: d.smtpPort || '',
              smtpUsername: d.smtpUsername || '',
            },
            social: {
              ...prev.social,
              instagram: d.instagram || '',
              telegram: d.telegram || '',
              twitter: d.twitter || '',
              whatsapp: d.whatsapp || '',
            },
            advanced: { ...prev.advanced, cacheEnabled: d.cacheEnabled ?? true },
          }));
        }
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const set = useCallback(
    <T extends keyof FormData>(tab: T, field: keyof FormData[T], value: unknown) => {
      setForm((prev) => ({ ...prev, [tab]: { ...prev[tab], [field]: value } }));
      setTestResult(null);
    },
    [],
  );

  // ── Save handlers ──────────────────────────────────────────────────────────
  const handleSaveGeneral = useCallback(async () => {
    setLoading(true);
    const r = await updateGeneralSettings({
      siteName: form.general.siteTitle,
      siteDescription: form.general.siteDescription,
      logoUrl: form.general.logoUrl,
    }).catch(() => ({ success: false, error: 'خطا در ذخیره' }));
    setLoading(false);
    if ((r as { success: boolean }).success)
      toast({ title: 'ذخیره شد', description: 'تنظیمات عمومی با موفقیت ذخیره شد' });
    else
      toast({
        title: 'خطا',
        description:
          typeof (r as { error?: unknown }).error === 'string'
            ? (r as { error: string }).error
            : 'خطا در ذخیره',
        variant: 'destructive',
      });
  }, [form.general, toast]);

  const handleSaveEmail = useCallback(async () => {
    setLoading(true);
    const r = await updateEmailSettings(form.email).catch(() => ({
      success: false,
      error: 'خطا در ذخیره',
    }));
    setLoading(false);
    if ((r as { success: boolean }).success)
      toast({ title: 'ذخیره شد', description: 'تنظیمات ایمیل با موفقیت ذخیره شد' });
    else
      toast({
        title: 'خطا',
        description:
          typeof (r as { error?: unknown }).error === 'string'
            ? (r as { error: string }).error
            : 'خطا',
        variant: 'destructive',
      });
  }, [form.email, toast]);

  const handleSaveAdvanced = useCallback(async () => {
    setLoading(true);
    const r = await updateCacheSettings({ cacheEnabled: form.advanced.cacheEnabled }).catch(() => ({
      success: false,
      error: 'خطا در ذخیره',
    }));
    setLoading(false);
    if ((r as { success: boolean }).success)
      toast({ title: 'ذخیره شد', description: 'تنظیمات پیشرفته ذخیره شد' });
    else
      toast({
        title: 'خطا',
        description:
          typeof (r as { error?: unknown }).error === 'string'
            ? (r as { error: string }).error
            : 'خطا',
        variant: 'destructive',
      });
  }, [form.advanced.cacheEnabled, toast]);

  const handleTestSmtp = useCallback(async () => {
    setLoading(true);
    setTestResult(null);
    const r = await testSmtpConnection(form.email).catch(() => ({
      success: false,
      message: 'خطا در تست',
    }));
    setLoading(false);
    setTestResult({
      ok: (r as { success: boolean }).success,
      msg:
        (r as { message?: string; error?: string }).message ||
        (r as { error?: string }).error ||
        (r as { success: boolean }).success
          ? 'اتصال موفق'
          : 'اتصال ناموفق',
    });
  }, [form.email]);

  const handleTestDb = useCallback(async () => {
    setLoading(true);
    setTestResult(null);
    const r = await testDatabaseConnection().catch(() => ({
      success: false,
      message: 'خطا در تست',
    }));
    setLoading(false);
    setTestResult({
      ok: (r as { success: boolean }).success,
      msg:
        (r as { message?: string; error?: string }).message ||
        (r as { error?: string }).error ||
        ((r as { success: boolean }).success ? 'اتصال موفق' : 'اتصال ناموفق'),
    });
  }, []);

  const handleGenerateApiKey = useCallback(async () => {
    setLoading(true);
    const r = await generateApiKey().catch(() => ({ success: false }));
    setLoading(false);
    if (
      (r as { success: boolean; data?: { apiKey: string } }).success &&
      (r as { data?: { apiKey: string } }).data?.apiKey
    ) {
      set('advanced', 'apiKey', (r as { data: { apiKey: string } }).data.apiKey);
      toast({ title: 'کلید تولید شد', description: 'کلید API جدید با موفقیت تولید شد' });
    }
  }, [set, toast]);

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setLoading(true);
      const fd = new FormData();
      fd.append('files', file);
      fd.append('folder', 'general');
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
        .then((r) => r.json())
        .catch(() => null);
      setLoading(false);
      if (res?.success && res.data?.files?.[0]?.url) {
        set('general', 'logoUrl', res.data.files[0].url);
        toast({ title: 'آپلود شد', description: 'لوگو با موفقیت آپلود شد' });
      } else {
        toast({
          title: 'خطا',
          description: res?.error?.message || 'خطا در آپلود',
          variant: 'destructive',
        });
      }
    },
    [set, toast],
  );

  if (initialLoading) {
    return (
      <div
        className="at-page"
        dir="rtl"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <Loader2 className="size-6 animate-spin" style={{ color: 'var(--at-accent)' }} />
      </div>
    );
  }

  return (
    <div className={`at-page ${s.page}`} dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'تنظیمات' }]}
        eyebrow="سیستم"
        title="تنظیمات"
        description="تنظیمات سیستم، امنیت، ایمیل و شبکه‌های اجتماعی"
      />

      <div className={s.body}>
        {/* ── Sidebar ── */}
        <nav className={s.sidebar} aria-label="بخش‌های تنظیمات">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setTestResult(null);
                }}
                className={`${s.navBtn} ${active ? s.navBtnActive : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className={s.navBtnIcon}>
                  <Icon size={15} aria-hidden />
                </span>
                <span className={s.navBtnText}>
                  <span>{tab.name}</span>
                  <span className={s.navBtnDesc}>{tab.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* ── Content ── */}
        <div className={s.content}>
          {/* ── General ── */}
          {activeTab === 'general' && (
            <div className="at-form-section">
              <div className="at-form-section__head">
                <div className="at-form-section__title">
                  <span className="at-form-section__ico">
                    <Settings size={16} />
                  </span>
                  <div>
                    <div className="at-form-section__title-text">تنظیمات عمومی سایت</div>
                    <div className="at-form-section__sub">اطلاعات اصلی و هویت سایت</div>
                  </div>
                </div>
              </div>
              <div className="at-form-section__body">
                <div className="at-form-grid">
                  <label className="at-field">
                    <span className="at-field__label">عنوان سایت</span>
                    <input
                      type="text"
                      className="at-input"
                      value={form.general.siteTitle}
                      onChange={(e) => set('general', 'siteTitle', e.target.value)}
                      placeholder="عنوان سایت را وارد کنید"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">توضیحات سایت</span>
                    <input
                      type="text"
                      className="at-input"
                      value={form.general.siteDescription}
                      onChange={(e) => set('general', 'siteDescription', e.target.value)}
                      placeholder="توضیحات کوتاه"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">ایمیل تماس</span>
                    <input
                      type="email"
                      className="at-input"
                      dir="ltr"
                      value={form.general.contactEmail}
                      onChange={(e) => set('general', 'contactEmail', e.target.value)}
                      placeholder="contact@example.com"
                      disabled={loading}
                    />
                  </label>
                </div>

                {/* Logo upload */}
                <div style={{ marginTop: 'var(--ds-space-4)' }}>
                  <span
                    className="at-field__label"
                    style={{ display: 'block', marginBottom: 'var(--ds-space-2)' }}
                  >
                    لوگوی سایت
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--ds-space-4)',
                      padding: 'var(--ds-space-4)',
                      borderRadius: 'var(--at-radius)',
                      border: '1.5px dashed var(--at-line-strong)',
                      background: 'var(--at-bg-deep)',
                    }}
                  >
                    {form.general.logoUrl ? (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.general.logoUrl}
                          alt="لوگوی سایت"
                          style={{
                            height: '60px',
                            width: 'auto',
                            objectFit: 'contain',
                            borderRadius: 'var(--ds-radius-sm)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => set('general', 'logoUrl', '')}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            insetInlineEnd: '-8px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'var(--at-danger)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          aria-label="حذف لوگو"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          height: '60px',
                          width: '60px',
                          flexShrink: 0,
                          borderRadius: 'var(--ds-radius-sm)',
                          background: 'var(--at-bg-elevated)',
                          border: '1px solid var(--at-line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ImageIcon size={24} style={{ color: 'var(--at-fg-subtle)' }} aria-hidden />
                      </div>
                    )}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--ds-space-2)',
                      }}
                    >
                      <input
                        type="text"
                        className="at-input"
                        dir="ltr"
                        value={form.general.logoUrl}
                        onChange={(e) => set('general', 'logoUrl', e.target.value)}
                        placeholder="https://example.com/logo.png"
                        disabled={loading}
                      />
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-2)' }}
                      >
                        <label
                          className={`at-btn ${loading ? '' : 'cursor-pointer'}`}
                          style={{
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.5 : 1,
                          }}
                        >
                          <Upload size={14} />
                          آپلود لوگو
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={loading}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--at-fg-subtle)' }}>
                          یا URL وارد کنید
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <SaveBtn loading={loading} onClick={handleSaveGeneral} />
              </div>
            </div>
          )}

          {/* ── Email ── */}
          {activeTab === 'email' && (
            <div className="at-form-section">
              <div className="at-form-section__head">
                <div className="at-form-section__title">
                  <span className="at-form-section__ico">
                    <Mail size={16} />
                  </span>
                  <div>
                    <div className="at-form-section__title-text">تنظیمات SMTP</div>
                    <div className="at-form-section__sub">سرور ایمیل برای ارسال پیام‌ها</div>
                  </div>
                </div>
              </div>
              <div className="at-form-section__body">
                <div className="at-form-grid">
                  <label className="at-field">
                    <span className="at-field__label">سرور SMTP</span>
                    <input
                      type="text"
                      className="at-input"
                      dir="ltr"
                      value={form.email.smtpServer}
                      onChange={(e) => set('email', 'smtpServer', e.target.value)}
                      placeholder="smtp.example.com"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">پورت</span>
                    <input
                      type="text"
                      className="at-input"
                      dir="ltr"
                      value={form.email.smtpPort}
                      onChange={(e) => set('email', 'smtpPort', e.target.value)}
                      placeholder="587"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">نام کاربری</span>
                    <input
                      type="text"
                      className="at-input"
                      dir="ltr"
                      value={form.email.smtpUsername}
                      onChange={(e) => set('email', 'smtpUsername', e.target.value)}
                      placeholder="user@example.com"
                      disabled={loading}
                      autoComplete="off"
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">رمز عبور</span>
                    <input
                      type="password"
                      className="at-input"
                      dir="ltr"
                      value={form.email.smtpPassword}
                      onChange={(e) => set('email', 'smtpPassword', e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                {testResult && (
                  <div className={s.testResult} data-ok={String(testResult.ok)}>
                    {testResult.ok ? (
                      <CheckCircle2 size={15} aria-hidden />
                    ) : (
                      <XCircle size={15} aria-hidden />
                    )}
                    {testResult.msg}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 'var(--ds-space-2)',
                    paddingTop: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={loading}
                    className="at-btn"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                    تست اتصال
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEmail}
                    disabled={loading}
                    className="at-btn at-btn--primary"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    ذخیره تنظیمات
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <div className="at-form-section">
              <div className="at-form-section__head">
                <div className="at-form-section__title">
                  <span className="at-form-section__ico">
                    <Shield size={16} />
                  </span>
                  <div>
                    <div className="at-form-section__title-text">تنظیمات امنیتی</div>
                    <div className="at-form-section__sub">مدیریت امنیت و دسترسی‌ها</div>
                  </div>
                </div>
              </div>
              <div className="at-form-section__body">
                <div className="at-form-stack" style={{ gap: 'var(--ds-space-2)' }}>
                  <ToggleRow
                    title="احراز هویت دو مرحله‌ای (2FA)"
                    desc="فعال‌سازی 2FA برای تمام کاربران ادمین"
                    enabled={form.security.twoFactorAuth}
                    onChange={() => set('security', 'twoFactorAuth', !form.security.twoFactorAuth)}
                    disabled={loading}
                  />
                  <ToggleRow
                    title="محدودیت IP"
                    desc="محدود کردن دسترسی به IP‌های مشخص"
                    enabled={form.security.ipRestriction}
                    onChange={() => set('security', 'ipRestriction', !form.security.ipRestriction)}
                    disabled={loading}
                  />
                </div>
                <div className="at-form-grid" style={{ marginTop: 'var(--ds-space-4)' }}>
                  <label className="at-field">
                    <span className="at-field__label">حداقل طول رمز عبور</span>
                    <select
                      className="at-select"
                      value={form.security.minPasswordLength}
                      onChange={(e) =>
                        set('security', 'minPasswordLength', Number.parseInt(e.target.value))
                      }
                      disabled={loading}
                    >
                      {[6, 8, 10, 12].map((v) => (
                        <option key={v} value={v}>
                          {v} کاراکتر
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">مدت زمان نشست</span>
                    <select
                      className="at-select"
                      value={form.security.sessionDuration}
                      onChange={(e) =>
                        set('security', 'sessionDuration', Number.parseInt(e.target.value))
                      }
                      disabled={loading}
                    >
                      {[
                        { v: 30, l: '۳۰ دقیقه' },
                        { v: 60, l: '۱ ساعت' },
                        { v: 120, l: '۲ ساعت' },
                        { v: 240, l: '۴ ساعت' },
                      ].map(({ v, l }) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingTop: '4px',
                  }}
                >
                  <button
                    type="button"
                    disabled={loading}
                    className="at-btn at-btn--primary"
                    onClick={() =>
                      toast({
                        title: 'در دست توسعه',
                        description: 'ذخیره تنظیمات امنیتی در نسخه آینده',
                      })
                    }
                  >
                    <Check size={14} />
                    ذخیره تنظیمات
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Social ── */}
          {activeTab === 'social' && (
            <div className="at-form-section">
              <div className="at-form-section__head">
                <div className="at-form-section__title">
                  <span className="at-form-section__ico">
                    <Share2 size={16} />
                  </span>
                  <div>
                    <div className="at-form-section__title-text">شبکه‌های اجتماعی</div>
                    <div className="at-form-section__sub">لینک‌های خارجی سایت</div>
                  </div>
                </div>
              </div>
              <div className="at-form-section__body">
                <SocialLinksManager />
              </div>
            </div>
          )}

          {/* ── Database ── */}
          {activeTab === 'database' && (
            <div className="at-form-section">
              <div className="at-form-section__head">
                <div className="at-form-section__title">
                  <span className="at-form-section__ico">
                    <Database size={16} />
                  </span>
                  <div>
                    <div className="at-form-section__title-text">پایگاه داده</div>
                    <div className="at-form-section__sub">اتصال و پیکربندی دیتابیس</div>
                  </div>
                </div>
              </div>
              <div className="at-form-section__body">
                <div className="at-form-grid">
                  <label className="at-field">
                    <span className="at-field__label">آدرس سرور</span>
                    <input
                      type="text"
                      className="at-input"
                      dir="ltr"
                      value={form.database.server}
                      onChange={(e) => set('database', 'server', e.target.value)}
                      placeholder="localhost"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">پورت</span>
                    <input
                      type="text"
                      className="at-input"
                      dir="ltr"
                      value={form.database.port}
                      onChange={(e) => set('database', 'port', e.target.value)}
                      placeholder="5432"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">نام پایگاه داده</span>
                    <input
                      type="text"
                      className="at-input"
                      dir="ltr"
                      value={form.database.name}
                      onChange={(e) => set('database', 'name', e.target.value)}
                      placeholder="fintech_db"
                      disabled={loading}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">نام کاربری</span>
                    <input
                      type="text"
                      className="at-input"
                      dir="ltr"
                      value={form.database.username}
                      onChange={(e) => set('database', 'username', e.target.value)}
                      placeholder="postgres"
                      disabled={loading}
                      autoComplete="off"
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">رمز عبور</span>
                    <input
                      type="password"
                      className="at-input"
                      dir="ltr"
                      value={form.database.password}
                      onChange={(e) => set('database', 'password', e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">نوع پایگاه داده</span>
                    <select
                      className="at-select"
                      value={form.database.type}
                      onChange={(e) => set('database', 'type', e.target.value)}
                      disabled={loading}
                    >
                      <option value="postgresql">PostgreSQL</option>
                      <option value="mysql">MySQL</option>
                      <option value="mongodb">MongoDB</option>
                    </select>
                  </label>
                </div>
                <div style={{ marginTop: 'var(--ds-space-3)' }}>
                  <ToggleRow
                    title="پشتیبان‌گیری خودکار"
                    desc="پشتیبان‌گیری دوره‌ای از پایگاه داده"
                    enabled={form.database.autoBackup}
                    onChange={() => set('database', 'autoBackup', !form.database.autoBackup)}
                    disabled={loading}
                  />
                </div>

                {testResult && (
                  <div className={s.testResult} data-ok={String(testResult.ok)}>
                    {testResult.ok ? (
                      <CheckCircle2 size={15} aria-hidden />
                    ) : (
                      <XCircle size={15} aria-hidden />
                    )}
                    {testResult.msg}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 'var(--ds-space-2)',
                    paddingTop: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleTestDb}
                    disabled={loading}
                    className="at-btn"
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Database size={14} />
                    )}
                    تست اتصال
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Advanced ── */}
          {activeTab === 'advanced' && (
            <div className="at-form-section">
              <div className="at-form-section__head">
                <div className="at-form-section__title">
                  <span className="at-form-section__ico">
                    <Wrench size={16} />
                  </span>
                  <div>
                    <div className="at-form-section__title-text">تنظیمات پیشرفته</div>
                    <div className="at-form-section__sub">cache، API key و عملکرد</div>
                  </div>
                </div>
              </div>
              <div className="at-form-section__body">
                <div className="at-form-stack" style={{ gap: 'var(--ds-space-2)' }}>
                  <ToggleRow
                    title="کش فعال"
                    desc="فعال‌سازی cache برای بهبود عملکرد سایت"
                    enabled={form.advanced.cacheEnabled}
                    onChange={() => set('advanced', 'cacheEnabled', !form.advanced.cacheEnabled)}
                    disabled={loading}
                  />
                  <ToggleRow
                    title="محدودیت نرخ API"
                    desc="جلوگیری از درخواست‌های بیش از حد"
                    enabled={form.advanced.apiRateLimit}
                    onChange={() => set('advanced', 'apiRateLimit', !form.advanced.apiRateLimit)}
                    disabled={loading}
                  />
                  <ToggleRow
                    title="حالت اشکال‌زدایی"
                    desc="فعال‌سازی لاگ‌های دقیق برای توسعه"
                    enabled={form.advanced.debugMode}
                    onChange={() => set('advanced', 'debugMode', !form.advanced.debugMode)}
                    disabled={loading}
                  />
                </div>

                <div className="at-form-grid" style={{ marginTop: 'var(--ds-space-4)' }}>
                  <label className="at-field">
                    <span className="at-field__label">مدت cache (ثانیه)</span>
                    <input
                      type="number"
                      className="at-input"
                      dir="ltr"
                      value={form.advanced.cacheDuration}
                      onChange={(e) =>
                        set('advanced', 'cacheDuration', Number.parseInt(e.target.value) || 60)
                      }
                      disabled={loading}
                      min={10}
                      max={3600}
                    />
                  </label>
                  <label className="at-field">
                    <span className="at-field__label">حداکثر آپلود (MB)</span>
                    <input
                      type="number"
                      className="at-input"
                      dir="ltr"
                      value={form.advanced.maxUploadSize}
                      onChange={(e) =>
                        set('advanced', 'maxUploadSize', Number.parseInt(e.target.value) || 10)
                      }
                      disabled={loading}
                      min={1}
                      max={100}
                    />
                  </label>
                </div>

                {/* API Key */}
                <div style={{ marginTop: 'var(--ds-space-4)' }}>
                  <label className="at-field">
                    <span className="at-field__label">کلید API سایت</span>
                    <div style={{ display: 'flex', gap: 'var(--ds-space-2)' }}>
                      <input
                        type="text"
                        className="at-input"
                        dir="ltr"
                        value={form.advanced.apiKey}
                        readOnly
                        disabled={loading}
                        style={{
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '0.75rem',
                          background: 'var(--at-bg-deep)',
                        }}
                        placeholder="برای تولید، دکمه تولید را بزنید"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateApiKey}
                        disabled={loading}
                        className="at-btn"
                        style={{ flexShrink: 0 }}
                      >
                        {loading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        تولید
                      </button>
                    </div>
                  </label>
                </div>

                <SaveBtn loading={loading} onClick={handleSaveAdvanced} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
